import {
  LogNewQuestion,
  LogNewAnswer,
  LogNotifyOfArbitrationRequest,
  RealityETHV30
} from "../generated/RealityETHV30/RealityETHV30"
import { ModerationInfo, User, Group, UserHistory, RealityCheck, Janny } from "../generated/schema"
import { Bytes, log, BigInt } from "@graphprotocol/graph-ts"

export function handleLogNotifyOfArbitrationRequest(event: LogNotifyOfArbitrationRequest): void {
  let moderationInfo = ModerationInfo.load(event.params.question_id.toHexString())
  if (!moderationInfo){
    log.error('moderation info not found. {}',[event.params.question_id.toHexString()])
    return
  }

  let realityCheck = RealityCheck.load(event.params.question_id.toHexString())
  if (!realityCheck){
    log.error('no reality answers found. {}',[event.params.question_id.toHexString()])
    return;
  }

  if(realityCheck.deadline < event.block.timestamp)
    return;

  let userHistory = UserHistory.load(moderationInfo.UserHistory)
  if (!userHistory){
    log.error('user history not found. {}',[moderationInfo.UserHistory])
    return
  }

  let group = Group.load(userHistory.group)
  if (!group){
    log.error('group not found. {}',[userHistory.group])
    return
  }

  let reportedByUserHistory = UserHistory.load(moderationInfo.reportedBy+group.groupID)
  if (!reportedByUserHistory){
    log.error('reportedByUserHistory not found. {}',[moderationInfo.reportedBy+group.groupID])
    return
  }
  const yes = Bytes.fromHexString('0x0000000000000000000000000000000000000000000000000000000000000001')

  if(RealityETHV30.bind(event.address).getBestAnswer(event.params.question_id).equals(yes)){
    reportedByUserHistory.countReportsMadeAndRespondedYes--
    userHistory.countBrokeRulesOptimistic--
    userHistory.timestampLastUpdated = event.block.timestamp
    userHistory.save()
    const oldStatus = reportedByUserHistory.status
    if(reportedByUserHistory.countReportsMade >= 10 && 3*reportedByUserHistory.countReportsMadeAndRespondedYes > 2*reportedByUserHistory.countReportsMade){
      reportedByUserHistory.status = "GoodSamaritan"
    } else if(reportedByUserHistory.countReportsMade >= 3 && 3*reportedByUserHistory.countReportsMadeAndRespondedYes > reportedByUserHistory.countReportsMade){
      reportedByUserHistory.status = "NeighborhoodWatch"
    } else if(reportedByUserHistory.countReportsMade >= 10 && 3*reportedByUserHistory.countReportsMadeAndRespondedYes < reportedByUserHistory.countReportsMade){
      reportedByUserHistory.status = "BoyWhoCriedWolf"
    } else {
      reportedByUserHistory.status = "CommunityMember"
    }

    if (oldStatus != reportedByUserHistory.status){
      reportedByUserHistory.timestampStatusUpdated = event.block.timestamp
    }

    reportedByUserHistory.save()
  }
}

export function handleLogNewAnswer(event: LogNewAnswer): void {
  
  let moderationInfo = ModerationInfo.load(event.params.question_id.toHexString())
  if (!moderationInfo){
    // answer to irrelevant question, skip
    return
  }

  let realityCheck = RealityCheck.load(event.params.question_id.toHexString())
  if (!realityCheck){
    if(event.block.timestamp.gt(moderationInfo.deadline)){
      log.error('reality question expired. qid: {}, ts: {}, deadline: {}',[event.params.question_id.toHexString(), event.block.timestamp.toString(), moderationInfo.deadline.toString()])
      return;
    }
    realityCheck = new RealityCheck(event.params.question_id.toHexString())
  }

  let userHistory = UserHistory.load(moderationInfo.UserHistory)
  if (!userHistory){
    log.error('user missing {}',[moderationInfo.UserHistory]);
    return;
  }
  let group = Group.load(userHistory.group);
  if (!group){
    log.error('userhistory group missing {}',[userHistory.group]);
    return;
  }

  let reportedByUserHistory = UserHistory.load(moderationInfo.reportedBy+group.groupID)
  if (!reportedByUserHistory){
    log.error('reportedByUserHistory missing {}',[moderationInfo.reportedBy]);
    return;
  }

  const currentAnswer = realityCheck.currentAnswer
  const yes = Bytes.fromHexString('0x0000000000000000000000000000000000000000000000000000000000000001')

  if(currentAnswer && currentAnswer.equals(yes)){
    if (event.params.answer.notEqual(yes)){
      reportedByUserHistory.countReportsMadeAndRespondedYes--
      userHistory.countBrokeRulesOptimistic--
      userHistory.timestampLastUpdated = event.block.timestamp
    }
  } else if (event.params.answer.equals(yes)){
    reportedByUserHistory.countReportsMadeAndRespondedYes++
    userHistory.countBrokeRulesOptimistic++
    userHistory.timestampLastUpdated = event.block.timestamp
  }
  
  realityCheck.currentAnswer = event.params.answer
  realityCheck.blocknumberLastUpdated = event.block.number
  realityCheck.timestampLastUpdated = event.block.timestamp
  realityCheck.deadline = event.block.timestamp.plus(moderationInfo.timeout);
  realityCheck.save()
  userHistory.save()

  const oldStatus = reportedByUserHistory.status
  if(reportedByUserHistory.countReportsMade >= 10 && 3*reportedByUserHistory.countReportsMadeAndRespondedYes > 2*reportedByUserHistory.countReportsMade){
    reportedByUserHistory.status = "GoodSamaritan"
  } else if(reportedByUserHistory.countReportsMade >= 3 && 3*reportedByUserHistory.countReportsMadeAndRespondedYes > reportedByUserHistory.countReportsMade){
    reportedByUserHistory.status = "NeighborhoodWatch"
  } else if(reportedByUserHistory.countReportsMade >= 10 && 3*reportedByUserHistory.countReportsMadeAndRespondedYes < reportedByUserHistory.countReportsMade){
    reportedByUserHistory.status = "BoyWhoCriedWolf"
  } else {
    reportedByUserHistory.status = "CommunityMember"
  }
/*
  if (reportedByUserHistory.countReportsMadeAndRespondedYes > 3){
  log.warning('reportedByUserHistory.status {}, {}, {}', [oldStatus])
  reportedByUserHistory.timestampStatusUpdated = event.block.timestamp
  }*/

  if (oldStatus != reportedByUserHistory.status){
    reportedByUserHistory.timestampStatusUpdated = event.block.timestamp
  }

  reportedByUserHistory.save()

  if(reportedByUserHistory.countReportsMadeAndRespondedYes > 0){
    let janny = Janny.load(userHistory.group)
    if(!janny){
      janny = new Janny(userHistory.group)
      janny.group = userHistory.group
      janny.botAddress = moderationInfo.askedBy
    }
  
    let sheriffOld = janny.sheriff
    let deputySheriffOld = janny.deputySheriff
  
    if((sheriffOld == reportedByUserHistory.id)||(deputySheriffOld == reportedByUserHistory.id)){
      return
    }

    if (!sheriffOld){//event.transaction.from.toHexString() + params[2] + params[1]+params[5])
      janny.sheriff = reportedByUserHistory.id
      janny.blocknumberLastUpdatedSheriff = event.block.number
      janny.timestampLastUpdatedSheriff = event.block.timestamp
      janny.save()
    } else if (!deputySheriffOld){
      janny.deputySheriff = reportedByUserHistory.id
      janny.timestampLastUpdatedDeputySheriff = event.block.timestamp
      janny.blocknumberLastUpdatedDeputySheriff = event.block.number
      janny.save()
    } else {
      let non_null_sheriff: string = sheriffOld ? sheriffOld : 'null' // compiles just fine :)
      const sheriff = UserHistory.load(non_null_sheriff)
      if (!sheriff){
        log.error('sheriff missing {}',[non_null_sheriff]);
        return;
      }

      if(sheriff.countReportsMadeAndRespondedYes < reportedByUserHistory.countReportsMadeAndRespondedYes){
        janny.sheriff = reportedByUserHistory.id
        janny.blocknumberLastUpdatedSheriff = event.block.number
        janny.timestampLastUpdatedSheriff = event.block.timestamp
        janny.save()
      } else{
        let non_null_deputySheriff: string = deputySheriffOld ? deputySheriffOld : 'null' // compiles just fine :)
        const deputySheriff = UserHistory.load(non_null_deputySheriff)
        if (!deputySheriff){
          log.error('deputy sheriff missing {}',[non_null_deputySheriff]);
          return;
        }
        if(deputySheriff.countReportsMadeAndRespondedYes < reportedByUserHistory.countReportsMadeAndRespondedYes){
          janny.deputySheriff = reportedByUserHistory.id
          janny.blocknumberLastUpdatedDeputySheriff = event.block.number
          janny.timestampLastUpdatedDeputySheriff = event.block.timestamp
          janny.save()
        }
      }
    }
  }
}



export function handleLogNewQuestion(event: LogNewQuestion): void {
  //if (event.params.template_id.toU32() === 60){ //XDAI
  const questionString = event.params.question;    
  const params = questionString.split('\u241f');
  if (params.length < 8)
    return;

  let group = Group.load(event.transaction.from.toHexString() + params[2] + params[5]);
  if (!group) {
    group = new Group(event.transaction.from.toHexString() + params[2] + params[5]);
    group.groupID = params[5];
    group.platform = params[2];
    group.botAddress = event.transaction.from;
    group.name = params[3];

    group.save();
  }

  let user = User.load(event.transaction.from.toHexString() + params[2] + params[1]);
  if (!user) {
    user = new User(event.transaction.from.toHexString() + params[2] + params[1]);
    user.userID = params[1];
    user.username = params[0];
    user.save();
  } else {
    user.username = params[0];
    user.save();
  }

  let moderationInfo = new ModerationInfo(event.params.question_id.toHexString());
  moderationInfo.moderationType = event.params.template_id;
  moderationInfo.reportedBy = event.transaction.from.toHexString()+params[2] + params[9] 
  let userReportedBy = User.load(moderationInfo.reportedBy);
  if (!userReportedBy) {
    userReportedBy = new User(moderationInfo.reportedBy);
    userReportedBy.userID = params[9];
    userReportedBy.save();
  }
  let reportedByUserHistory = UserHistory.load(moderationInfo.reportedBy+params[5])
  if (!reportedByUserHistory){
    reportedByUserHistory = new UserHistory(moderationInfo.reportedBy+params[5])
    reportedByUserHistory.status = "CommunityMember"
    reportedByUserHistory.user = moderationInfo.reportedBy
    reportedByUserHistory.group = group.id
    reportedByUserHistory.countReportsMade = 0
    reportedByUserHistory.countBrokeRulesOptimistic = 0
    reportedByUserHistory.countBrokeRulesArbitrated = 0
    reportedByUserHistory.timestampLastUpdated = BigInt.fromU32(0)
    reportedByUserHistory.countReportsMadeAndRespondedYes = 0
    reportedByUserHistory.timestampStatusUpdated = BigInt.fromU32(0)
    reportedByUserHistory.countReportsMadeAndDisputedYes = 0
  }
  moderationInfo.deadline = event.params.opening_ts.plus(event.params.timeout);
  moderationInfo.timeout = event.params.timeout;
  moderationInfo.askedBy = event.transaction.from;
  moderationInfo.rulesUrl = params[6];
  moderationInfo.message = params[7];
  moderationInfo.reality = event.params.question_id.toHexString()
  moderationInfo.messageBackup = params[8];

  let reportedUser = UserHistory.load(event.transaction.from.toHexString() + params[2] + params[1]+params[5])
  if (!reportedUser){
    reportedUser = new UserHistory(event.transaction.from.toHexString() + params[2] + params[1]+params[5])
    reportedUser.status = "CommunityMember"
    reportedUser.countBrokeRulesArbitrated = 0
    reportedUser.countBrokeRulesOptimistic = 0
    reportedUser.countReportsMade = 0
    reportedUser.countReportsMadeAndRespondedYes = 0
    reportedUser.countReportsMadeAndDisputedYes = 0
    reportedUser.timestampStatusUpdated = BigInt.fromU32(0)
    reportedUser.timestampLastReport = BigInt.fromU32(0)
    reportedUser.timestampLastUpdated = BigInt.fromU32(0)
    reportedUser.user = event.transaction.from.toHexString() + params[2] + params[1]
    reportedUser.group = group.id
    reportedUser.save()
  }
  moderationInfo.UserHistory = reportedUser.id;


  moderationInfo.save();    
  

  reportedByUserHistory.countReportsMade++
  reportedByUserHistory.timestampLastReport = event.block.timestamp
  reportedByUserHistory.save()
}
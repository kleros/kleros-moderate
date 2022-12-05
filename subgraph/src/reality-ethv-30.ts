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
  let userHistory = UserHistory.load(moderationInfo.UserHistory)
  if (!userHistory){
    log.error('user history not found. {}',[moderationInfo.UserHistory])
    return
  }
  if(RealityETHV30.bind(event.address).getBestAnswer(event.params.question_id) === new Bytes(1)){
    userHistory.countBrokeRulesOptimisticAndArbitrated--
    userHistory.timestampLastUpdated = event.block.timestamp
    if(userHistory.countBrokeRulesOptimisticAndArbitrated === 0)
        userHistory.timestampParole.minus(BigInt.fromU32(86400))
    if(userHistory.countBrokeRulesOptimisticAndArbitrated === 1)
        userHistory.timestampParole.minus(BigInt.fromU32(604800))

    userHistory.save()
  }
}

export function handleLogNewAnswer(event: LogNewAnswer): void {
  
  let moderationInfo = ModerationInfo.load(event.params.question_id.toHexString())
  if (!moderationInfo){
    // answer to irrelevant question, skip
    return
  }

  let realityCheck = RealityCheck.load(event.params.question_id.toHexString())
  if (!realityCheck)
    realityCheck = new RealityCheck(event.params.question_id.toHexString())

  let userHistory = UserHistory.load(moderationInfo.UserHistory)
  if (!userHistory){
    log.error('user missing {}',[moderationInfo.UserHistory]);
    return;
  }
  let group = Group.load(userHistory.group);
  if (!group){
    log.error('usrhistory group missing {}',[userHistory.group]);
    return;
  }

  let reportedByUserHistory = UserHistory.load(moderationInfo.reportedBy)
  if (!reportedByUserHistory){
    log.error('reportedByUserHistory missing {}',[moderationInfo.reportedBy]);
    return;
  }


  const currentAnswer = realityCheck.currentAnswer
  const yes = Bytes.fromHexString('0x0000000000000000000000000000000000000000000000000000000000000001')

  if(currentAnswer && currentAnswer.equals(yes)){
    if (event.params.answer.notEqual(yes)){
      reportedByUserHistory.countReportsMadeAndResponded--
      realityCheck.timeServed = event.block.timestamp.minus(realityCheck.deadline.minus(moderationInfo.timeout));
      userHistory.countBrokeRulesOptimisticAndArbitrated--
      userHistory.timestampLastUpdated = event.block.timestamp
      if(userHistory.countBrokeRulesOptimisticAndArbitrated === 0)
        userHistory.timestampParole.minus(BigInt.fromU32(86400))
      if(userHistory.countBrokeRulesOptimisticAndArbitrated === 1)
        userHistory.timestampParole.minus(BigInt.fromU32(604800))
    }
  } else if (event.params.answer.equals(yes)){
    reportedByUserHistory.countReportsMadeAndResponded++
    realityCheck.timeServed = BigInt.fromU32(0)
    userHistory.countBrokeRulesOptimisticAndArbitrated++
    userHistory.timestampLastUpdated = event.block.timestamp
    if(userHistory.countBrokeRulesOptimisticAndArbitrated === 1)
      userHistory.timestampParole = event.block.timestamp.plus(BigInt.fromU32(86400))
    if(userHistory.countBrokeRulesOptimisticAndArbitrated === 2)
      userHistory.timestampParole = event.block.timestamp.ge(userHistory.timestampParole) ? event.block.timestamp.plus(BigInt.fromU32(604800)) : userHistory.timestampParole.plus(BigInt.fromU32(604800))
  }
  
  realityCheck.currentAnswer = event.params.answer
  realityCheck.blocknumberLastUpdated = event.block.number
  realityCheck.timestampLastUpdated = event.block.timestamp
  realityCheck.deadline = event.block.timestamp.plus(moderationInfo.timeout);
  realityCheck.save()
  userHistory.save()

  reportedByUserHistory.save()

  if(reportedByUserHistory.countReportsMadeAndResponded > 0){
    let janny = Janny.load(userHistory.group)
    if(!janny){
      janny = new Janny(userHistory.group)
      janny.group = userHistory.group
      janny.botAddress = moderationInfo.askedBy
    }
  
    let sheriffOld = janny.sheriff
    let deputySheriffOld = janny.deputySheriff
  
    if (!sheriffOld){//event.transaction.from.toHexString() + params[2] + params[1]+params[5])
      janny.sheriff = moderationInfo.reportedBy
      janny.blocknumberLastUpdatedSheriff = event.block.number
      janny.timestampLastUpdatedSheriff = event.block.timestamp
      janny.save()
    } else if (!deputySheriffOld){
      janny.deputySheriff = moderationInfo.reportedBy
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
      if(sheriff.countReportsMadeAndResponded < reportedByUserHistory.countReportsMadeAndResponded){
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
        if(deputySheriff.countReportsMadeAndResponded < reportedByUserHistory.countReportsMadeAndResponded){
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
  if (group === null) {
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
  }

  let moderationInfo = new ModerationInfo(event.params.question_id.toHexString());
  moderationInfo.moderationType = event.params.template_id;
  moderationInfo.reportedBy = event.transaction.from.toHexString()+params[2] + params[9]  +params[5]  
  if (!UserHistory.load(moderationInfo.reportedBy)){
    let reportedByUser = new UserHistory(event.transaction.from.toHexString() + params[2] + params[9]+params[5])
    reportedByUser.countBrokeRulesArbitrated = 0
    reportedByUser.countBrokeRulesOptimisticAndArbitrated = 0
    reportedByUser.countReportsMade = 0
    reportedByUser.countReportsMadeAndResponded = 0
    reportedByUser.timestampLastReport = BigInt.fromU32(0)
    reportedByUser.timestampLastUpdated = BigInt.fromU32(0)
    reportedByUser.timestampParole = BigInt.fromU32(0)
    reportedByUser.user = event.transaction.from.toHexString() + params[2] + params[9]
    reportedByUser.group = group.id
    reportedByUser.save()
    if(!User.load(reportedByUser.user)){
      let userReportedBy = new User(reportedByUser.user)
      userReportedBy.userID = params[9]
      userReportedBy.username = params[0]
      userReportedBy.save()
    }
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
    reportedUser.countBrokeRulesArbitrated = 0
    reportedUser.countBrokeRulesOptimisticAndArbitrated = 0
    reportedUser.countReportsMade = 0
    reportedUser.countReportsMadeAndResponded = 0
    reportedUser.timestampLastReport = BigInt.fromU32(0)
    reportedUser.timestampLastUpdated = BigInt.fromU32(0)
    reportedUser.timestampParole = BigInt.fromU32(0)
    reportedUser.user = event.transaction.from.toHexString() + params[2] + params[1]
    reportedUser.group = group.id
    reportedUser.save()
  }
  moderationInfo.UserHistory = reportedUser.id;


  moderationInfo.save();    
  
  let reportedByUserHistory = UserHistory.load(moderationInfo.reportedBy+params[5])
  if (!reportedByUserHistory){
    reportedByUserHistory = new UserHistory(moderationInfo.reportedBy+params[5])
    reportedByUserHistory.user = moderationInfo.reportedBy
    reportedByUserHistory.group = group.id
    reportedByUserHistory.countReportsMade = 0
    reportedByUserHistory.countBrokeRulesOptimisticAndArbitrated = 0
    reportedByUserHistory.countBrokeRulesArbitrated = 0
    reportedByUserHistory.timestampParole = BigInt.fromU32(0)
    reportedByUserHistory.timestampLastUpdated = BigInt.fromU32(0)
    reportedByUserHistory.countReportsMadeAndResponded = 0
  }
  reportedByUserHistory.countReportsMade++
  reportedByUserHistory.timestampLastReport = event.block.timestamp
  reportedByUserHistory.save()
}
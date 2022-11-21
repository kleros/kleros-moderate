import {
  LogNewQuestion,
  LogNewAnswer,
  LogNotifyOfArbitrationRequest,
  RealityETHV30
} from "../generated/RealityETHV30/RealityETHV30"
import { ModerationInfo, User, Group, UserHistory, RealityCheck, Janny } from "../generated/schema"
import { Bytes, log, BigInt } from "@graphprotocol/graph-ts"

export function handleLogNotifyOfArbitrationRequest(event: LogNotifyOfArbitrationRequest): void {
  const moderationInfo = ModerationInfo.load(event.params.question_id.toHexString())
  if (!moderationInfo){
    log.error('moderation info not found. {}',[event.params.question_id.toHexString()])
    return
  }
  let userHistory = UserHistory.load(moderationInfo.user)
  if (!userHistory){
    log.error('user history not found. {}',[moderationInfo.user])
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
  
  const moderationInfo = ModerationInfo.load(event.params.question_id.toHexString())
  if (!moderationInfo){
    // answer to irrelevant question, skip
    return
  }

  var realityCheck = RealityCheck.load(event.params.question_id.toHexString())
  if (!realityCheck)
    realityCheck = new RealityCheck(event.params.question_id.toHexString())

  let userHistory = UserHistory.load(moderationInfo.user)
  if (!userHistory){
    userHistory = new UserHistory(moderationInfo.user)
    userHistory.countBrokeRulesArbitrated = 0
    userHistory.countBrokeRulesOptimisticAndArbitrated = 0
    userHistory.countReportsMade = 0
    userHistory.countReportsMadeAndResponded = 0
    userHistory.timestampLastReport = BigInt.fromU32(0)
    userHistory.timestampLastUpdated = BigInt.fromU32(0)
    userHistory.timestampParole = BigInt.fromU32(0)
    userHistory.user = moderationInfo.user
  }

  const reportedByUserHistory = UserHistory.load(moderationInfo.reportedBy)
  if (!reportedByUserHistory){
    log.error('reportedByUserHistory missing {}',[moderationInfo.reportedBy]);
    return;
  }
  reportedByUserHistory.countReportsMadeAndResponded++
  reportedByUserHistory.save()

  const user = User.load(moderationInfo.user)
  if (!user){
    log.error('user missing {}',[moderationInfo.user]);
    return;
  }
  
  var janny = Janny.load(user.group)
  if(!janny){
    janny = new Janny(user.group)
    janny.group = user.group
  }

  let sheriffOld = janny.sheriff
  let deputySheriffOld = janny.deputySheriff

  if (!sheriffOld){
    janny.sheriff = moderationInfo.reportedBy
    janny.blocknumberLastUpdatedSheriff = event.block.number
    janny.timestampLastUpdatedSheriff = event.block.number
    janny.save()
  } else if (!deputySheriffOld){
    janny.deputySheriff = moderationInfo.reportedBy
    janny.deputySheriff = moderationInfo.reportedBy
    janny.timestampLastUpdatedDeputySheriff = event.block.number
    janny.save()
  } else {
    let non_null_sheriff: string = sheriffOld ? sheriffOld : 'null' // compiles just fine :)
    const sheriff = UserHistory.load(non_null_sheriff)
    if (!sheriff){
      log.error('sheriff missing {}',[non_null_sheriff]);
      return;
    }
    if(sheriff.countReportsMadeAndResponded < reportedByUserHistory.countReportsMadeAndResponded){
      janny.sheriff = reportedByUserHistory.user
      janny.blocknumberLastUpdatedSheriff = event.block.number
      janny.timestampLastUpdatedSheriff = event.block.number
      janny.save()
    } else{
      let non_null_deputySheriff: string = deputySheriffOld ? deputySheriffOld : 'null' // compiles just fine :)
      const deputySheriff = UserHistory.load(non_null_deputySheriff)
      if (!deputySheriff){
        log.error('deputy sheriff missing {}',[non_null_deputySheriff]);
        return;
      }
      if(deputySheriff.countReportsMadeAndResponded < reportedByUserHistory.countReportsMadeAndResponded){
        janny.deputySheriff = reportedByUserHistory.user
        janny.blocknumberLastUpdatedDeputySheriff = event.block.number
        janny.timestampLastUpdatedDeputySheriff = event.block.number
        janny.save()
      }
    }
  }
  

  const currentAnswer = realityCheck.currentAnswer
  const yes = Bytes.fromHexString('0x0000000000000000000000000000000000000000000000000000000000000001')

  if(currentAnswer && currentAnswer.equals(yes)){
    if (event.params.answer.notEqual(yes)){
      realityCheck.timeServed = event.block.timestamp.minus(realityCheck.deadline.minus(moderationInfo.timeout));
      userHistory.countBrokeRulesOptimisticAndArbitrated--
      userHistory.timestampLastUpdated = event.block.timestamp
      if(userHistory.countBrokeRulesOptimisticAndArbitrated === 0)
        userHistory.timestampParole.minus(BigInt.fromU32(86400))
      if(userHistory.countBrokeRulesOptimisticAndArbitrated === 1)
        userHistory.timestampParole.minus(BigInt.fromU32(604800))
    }
  } else if (event.params.answer.equals(yes)){
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
  realityCheck.timestampLastUpdated = event.block.number
  realityCheck.deadline = event.block.timestamp.plus(moderationInfo.timeout);
  realityCheck.save()
  userHistory.save()
}



export function handleLogNewQuestion(event: LogNewQuestion): void {
  //if (event.params.template_id.toU32() === 60){ //XDAI
  const questionString = event.params.question;    
  const params = questionString.split('\u241f');
  if (params.length < 10)
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
  if (user === null) {
    user = new User(event.transaction.from.toHexString() + params[2] + params[1]);
    user.userID = params[1];
    user.username = params[0];
    user.group = event.transaction.from.toHexString() + params[2] + params[5]; 
    user.save();
  }

  const moderationInfo = new ModerationInfo(event.params.question_id.toHexString());
  moderationInfo.moderationType = event.params.template_id;
  moderationInfo.reportedBy = event.transaction.from.toHexString()+params[2] + params[9]    
  if (!User.load(moderationInfo.reportedBy)){
    const userReportedBy = new User(moderationInfo.reportedBy)
    userReportedBy.group = user.group
    userReportedBy.userID = params[9]
    userReportedBy.save()
  }
  moderationInfo.deadline = event.params.opening_ts.plus(event.params.timeout);
  moderationInfo.timeout = event.params.timeout;
  moderationInfo.askedBy = event.transaction.from;
  moderationInfo.rulesUrl = params[6];
  moderationInfo.message = params[7];
  moderationInfo.reality = event.params.question_id.toHexString()
  moderationInfo.messageBackup = params[8];
  moderationInfo.user = event.transaction.from.toHexString() + params[2] + params[1];

  moderationInfo.save();    
  
  var reportedByUserHistory = UserHistory.load(moderationInfo.reportedBy)
  if (!reportedByUserHistory){
    reportedByUserHistory = new UserHistory(moderationInfo.reportedBy)
    reportedByUserHistory.user = moderationInfo.reportedBy
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
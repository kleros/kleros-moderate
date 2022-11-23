import {
    DisputeIDToQuestionID as DisputeIDToQuestionIDEvent,
    RulingFunded as RulingFundedEvent,
    Ruling as RulingEvent,
    Evidence as EvidenceEvent
  } from "../generated/Realitio_v2_1_ArbitratorWithAppeals/Realitio_v2_1_ArbitratorWithAppeals"
import {
    ModerationDispute, ModerationInfo, UserHistory, 
  } from "../generated/schema"
  import { log, Bytes, BigInt } from "@graphprotocol/graph-ts"
  
  export function handleDisputeIDToQuestionID(
    event: DisputeIDToQuestionIDEvent
  ): void {
    const moderationDispute = new ModerationDispute(event.params._disputeID.toHexString());
    moderationDispute.moderationInfo = event.params._questionID.toHexString()
    moderationDispute.timestampLastUpdated = event.block.timestamp
    moderationDispute.save();
  }
/*
  export function handleEvidenceEvent(
    event: EvidenceEvent
  ): void {
    event.params._event.logIndex
  }
*/
  export function handleRuling(event: RulingEvent): void {
    const moderationDispute = ModerationDispute.load(event.params._disputeID.toHexString());
    if (!moderationDispute){
      log.error('Moderation Dispute not found. {}',[event.params._disputeID.toHexString()]);
      return;
    }
    moderationDispute.finalRuling = event.params._ruling
    moderationDispute.save()

    const modinfo = ModerationInfo.load(moderationDispute.moderationInfo)
    if (!modinfo){
      log.error("ModerationInfo not found {}.", [moderationDispute.moderationInfo]);
      return;
    }
    const userHistory = UserHistory.load(modinfo.UserHistory)
    if (!userHistory){
      log.error("UserHistory not found {}.", [modinfo.UserHistory]);
      return;
    }

    if (event.params._ruling.equals(BigInt.fromU32(1))){
      userHistory.countBrokeRulesOptimisticAndArbitrated++
      userHistory.countBrokeRulesArbitrated++
      userHistory.timestampLastUpdated = event.block.timestamp
      if(userHistory.countBrokeRulesOptimisticAndArbitrated === 1)
        userHistory.timestampParole = event.block.timestamp.plus(BigInt.fromU32(86400))
      if(userHistory.countBrokeRulesOptimisticAndArbitrated === 2)
        userHistory.timestampParole = event.block.timestamp.ge(userHistory.timestampParole) ? event.block.timestamp.plus(BigInt.fromU32(604800)) : userHistory.timestampParole.plus(BigInt.fromU32(604800))
    }
    userHistory.save()
  }

  export function handleRulingFunded(event: RulingFundedEvent): void {
    let moderationInfo = ModerationInfo.load(event.params._localDisputeID.toHexString());
    if (!moderationInfo){
      log.error('Moderation Info not found {}.',[event.params._localDisputeID.toHexString()]);
      return;
    }
    const dispute = moderationInfo.dispute
    const dispute_non_null = dispute ? dispute : 'no-dispute';
    const moderationDispute = ModerationDispute.load(dispute_non_null);
    if (!moderationDispute){
      log.error('Moderation Dispute not found {}.',[])
      return;
    }
    moderationDispute.rulingFunded = event.params._ruling
    moderationDispute.timestampLastRound = event.block.timestamp
    moderationDispute.save();
  }
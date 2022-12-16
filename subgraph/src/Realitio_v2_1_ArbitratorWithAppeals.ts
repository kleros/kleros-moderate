import {
    DisputeIDToQuestionID as DisputeIDToQuestionIDEvent,
    RulingFunded as RulingFundedEvent,
    Ruling as RulingEvent,
    Evidence as EvidenceEvent
  } from "../generated/Realitio_v2_1_ArbitratorWithAppeals/Realitio_v2_1_ArbitratorWithAppeals"
import {
    ModerationDispute, ModerationInfo, RealityCheck, UserHistory, Group
  } from "../generated/schema"
  import { log, Bytes, BigInt } from "@graphprotocol/graph-ts"
  
  export function handleDisputeIDToQuestionID(
    event: DisputeIDToQuestionIDEvent
  ): void {
    let realityCheck = RealityCheck.load(event.params._questionID.toHexString())
    if (!realityCheck){
      log.error('no reality check found for dispute. {}', [event.params._questionID.toHexString()])
      return
    }

    let moderationDispute = new ModerationDispute(event.params._disputeID.toHexString());
    moderationDispute.moderationInfo = event.params._questionID.toHexString()
    moderationDispute.timestampLastUpdated = event.block.timestamp
    moderationDispute.save();

    realityCheck.dispute = event.params._disputeID.toHexString()
    realityCheck.save()
  }
/*
  export function handleEvidenceEvent(
    event: EvidenceEvent
  ): void {
    event.params._event.logIndex
  }
*/
  export function handleRuling(event: RulingEvent): void {
    let moderationDispute = ModerationDispute.load(event.params._disputeID.toHexString());
    if (!moderationDispute){
      log.error('Moderation Dispute not found. {}',[event.params._disputeID.toHexString()]);
      return;
    }
    moderationDispute.finalRuling = event.params._ruling
    moderationDispute.timestampLastUpdated = event.block.timestamp
    moderationDispute.save()

    let modinfo = ModerationInfo.load(moderationDispute.moderationInfo)
    if (!modinfo){
      log.error("ModerationInfo not found {}.", [moderationDispute.moderationInfo]);
      return;
    }
    let userHistory = UserHistory.load(modinfo.UserHistory)
    if (!userHistory){
      log.error("UserHistory not found {}.", [modinfo.UserHistory]);
      return;
    }

    let group = Group.load(userHistory.group)
    if (!group){
      log.error('group not found. {}',[userHistory.group])
      return
    }
  
    let reportedByUserHistory = UserHistory.load(modinfo.reportedBy+group.groupID)
    if (!reportedByUserHistory){
      log.error('reportedByUserHistory not found. {}',[modinfo.reportedBy+group.groupID])
      return
    }

    if (event.params._ruling.equals(BigInt.fromU32(2))){ // kleros 2 is yes
      userHistory.countBrokeRulesArbitrated++
      userHistory.timestampLastUpdated = event.block.timestamp

      reportedByUserHistory.countReportsMadeAndDisputedYes = 1
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
    let moderationDispute = ModerationDispute.load(dispute_non_null);
    if (!moderationDispute){
      log.error('Moderation Dispute not found {}.',[])
      return;
    }
    moderationDispute.rulingFunded = event.params._ruling
    moderationDispute.timestampLastRound = event.block.timestamp
    moderationDispute.save();
  }
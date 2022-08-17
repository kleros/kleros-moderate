import {
    Contribution as ContributionEvent,
    Dispute as DisputeEvent,
    DisputeIDToQuestionID as DisputeIDToQuestionIDEvent,
    Evidence as EvidenceEvent,
    MetaEvidence as MetaEvidenceEvent,
    Ruling as RulingEvent,
    RulingFunded as RulingFundedEvent,
    Withdrawal as WithdrawalEvent
  } from "../generated/Contract/Contract"
  import {
    Ruling,
    Question,
    DisputeIDToQuestionID
  } from "../generated/schema"
  import { BigInt, log } from "@graphprotocol/graph-ts"
  
  
  export function handleContribution(event: ContributionEvent): void {
    
  }
  
  export function handleDispute(event: DisputeEvent): void {
  }
  
  export function handleDisputeIDToQuestionID(
    event: DisputeIDToQuestionIDEvent
  ): void {
    let question = Question.load(event.params._questionID.toHexString());
  
    if (question === null) {
      log.error(`handleSubmitAnswerByArbitrator: question ${event.params._questionID.toHexString()} not found`, [])
      return;
    }
    question.disputeId = event.params._disputeID;
    question.save();
  
    let entity = new DisputeIDToQuestionID(event.params._disputeID.toHexString());
  
    entity._questionID = event.params._questionID.toHexString();
    entity.save();
  }
  
  export function handleEvidence(event: EvidenceEvent): void {
  }
  
  export function handleMetaEvidence(event: MetaEvidenceEvent): void {
  }
  
  export function handleRuling(event: RulingEvent): void {
    let entity = DisputeIDToQuestionID.load(
      event.params._disputeID.toHexString()
    )
    if (entity === null) {
      log.error(`dispute ${event.params._disputeID.toHexString()} not found`, [])
      return;
    }
    let question = Question.load(entity._questionID);
  
    if (question === null) {
      log.error(`question ${entity._questionID} not found`, [])
      return;
    }
    question.ruling = event.params._ruling;
    question.save();
  }
  // appeal funding
  export function handleRulingFunded(event: RulingFundedEvent): void {
    let question = Question.load(event.params._localDisputeID.toHexString());
  
    if (question === null) {
      log.error(`handleRulingFunded: question ${event.params._localDisputeID.toHexString()} not found`, [])
      return;
    }
    question.appeals = event.params._round;
    question.save();
  }
  
  export function handleWithdrawal(event: WithdrawalEvent): void {
  }
  
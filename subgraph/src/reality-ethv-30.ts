import { BigInt, log } from "@graphprotocol/graph-ts"
import {
  RealityETHV30,
  LogAnswerReveal,
  LogCancelArbitration,
  LogClaim,
  LogFinalize,
  LogFundAnswerBounty,
  LogMinimumBond,
  LogNewAnswer,
  LogNewQuestion,
  LogNewTemplate,
  LogNotifyOfArbitrationRequest,
  LogReopenQuestion,
  LogSetQuestionFee,
  LogWithdraw,
} from "../generated/RealityETHV30/RealityETHV30"
import { Question, User, Group } from "../generated/schema"

/*
export function handleLogAnswerReveal(event: LogAnswerReveal): void {
  // Entities can be loaded from the store using a string ID; this ID
  // needs to be unique across all entities of the same type
  let entity = ExampleEntity.load(event.transaction.from.toHex())

  // Entities only exist after they have been saved to the store;
  // `null` checks allow to create entities on demand
  if (!entity) {
    entity = new ExampleEntity(event.transaction.from.toHex())

    // Entity fields can be set using simple assignments
    entity.count = BigInt.fromI32(0)
  }

  // BigInt and BigDecimal math are supported
  entity.count = entity.count + BigInt.fromI32(1)

  // Entity fields can be set based on event parameters
  entity.question_id = event.params.question_id
  entity.user = event.params.user

  // Entities can be written to the store with `.save()`
  entity.save()

  // Note: If a handler doesn't require existing field values, it is faster
  // _not_ to load the entity from the store. Instead, create it fresh with
  // `new Entity(...)`, set the fields that should be updated and save the
  // entity back to the store. Fields that were not set or unset remain
  // unchanged, allowing for partial updates to be applied.

  // It is also possible to access smart contracts from mappings. For
  // example, the contract that has emitted the event can be connected to
  // with:
  //
  // let contract = Contract.bind(event.address)
  //
  // The following functions can then be called on this contract to access
  // state variables and other data:
  //
  // - contract.arbitrator_question_fees(...)
  // - contract.balanceOf(...)
  // - contract.commitments(...)
  // - contract.createTemplate(...)
  // - contract.getArbitrator(...)
  // - contract.getBestAnswer(...)
  // - contract.getBond(...)
  // - contract.getBounty(...)
  // - contract.getContentHash(...)
  // - contract.getFinalAnswer(...)
  // - contract.getFinalAnswerIfMatches(...)
  // - contract.getFinalizeTS(...)
  // - contract.getHistoryHash(...)
  // - contract.getMinBond(...)
  // - contract.getOpeningTS(...)
  // - contract.getTimeout(...)
  // - contract.isFinalized(...)
  // - contract.isPendingArbitration(...)
  // - contract.isSettledTooSoon(...)
  // - contract.question_claims(...)
  // - contract.questions(...)
  // - contract.reopened_questions(...)
  // - contract.reopener_questions(...)
  // - contract.resultFor(...)
  // - contract.resultForOnceSettled(...)
  // - contract.template_hashes(...)
  // - contract.templates(...)
}*/

export function handleLogCancelArbitration(event: LogCancelArbitration): void {}

export function handleLogClaim(event: LogClaim): void {}

export function handleLogFinalize(event: LogFinalize): void {
  let question = Question.load(event.params.question_id.toHexString());

  if (question === null) {
    log.error(`handleSubmitAnswerByArbitrator: question ${event.params.question_id.toHexString()} not found`, [])
    return;
  }

  question.finalize_ts = event.block.timestamp;

  question.save();
}

export function handleLogFundAnswerBounty(event: LogFundAnswerBounty): void {}

export function handleLogMinimumBond(event: LogMinimumBond): void {}

export function handleLogNewAnswer(event: LogNewAnswer): void {
  let question = Question.load(event.params.question_id.toHexString());

  if (question === null) {
    log.error(`handleSubmitAnswer: question ${event.params.question_id.toHexString()} not found`, [])
    return;
  } else {

    question.finalize_ts = event.block.timestamp.plus(question.timeout);
    question.bond = event.params.bond;

    question.save();
  }
}

export function handleLogNewQuestion(event: LogNewQuestion): void {
  //if (event.params.template_id.toU32() === 58){ //XDAI
  if (event.params.template_id.toU32() === 392){ // Rinkeby
      const questionString = event.params.question;    
    const params = questionString.split('\u241f');
    if (params.length < 10)
      return;

    const question = new Question(event.params.question_id.toHexString());

    let group = Group.load(params[4] + params[2]);
    if (group === null) {
      group = new Group(params[4] + params[2]);
      group.groupID = params[4];
      group.platform = params[2];
      group.name = params[3];
      group.save();
    }

    let user = User.load(params[1] + params[2]);
    if (user === null) {
      user = new User(params[1] + params[2]);
      user.userID = params[1];
      user.username = params[0];
      user.group = params[4] + params[2]; 
      user.save();
    }
    question.rulesUrl = params[5];
    question.message = params[6];
    question.messageBackup = params[7];
    question.askedBy = event.transaction.from;
    question.timeout = event.params.timeout;
    question.finalize_ts = event.block.timestamp.plus(question.timeout);
    question.user = params[1] + params[2];

    question.save();    
  }

}

export function handleLogNewTemplate(event: LogNewTemplate): void {}

export function handleLogNotifyOfArbitrationRequest(
  event: LogNotifyOfArbitrationRequest
): void {
  let question = Question.load(event.params.question_id.toHexString());

  if (question === null) {
    log.error(`handleSubmitAnswerByArbitrator: question ${event.params.question_id.toHexString()} not found`, [])
    return;
  }

  question.arbitrationRequested = true;

  question.save();
}

export function handleLogReopenQuestion(event: LogReopenQuestion): void {}

export function handleLogSetQuestionFee(event: LogSetQuestionFee): void {}

export function handleLogWithdraw(event: LogWithdraw): void {}

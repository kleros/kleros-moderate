import {
  LogNewAnswer,
  LogNewQuestion,
  SubmitAnswerByArbitratorCall,
  SubmitAnswerCall,
  SubmitAnswerCommitmentCall,
  SubmitAnswerForCall,
  SubmitAnswerRevealCall
} from "../generated/RealityETHV30/RealityETHV30"
import { Question } from "../generated/schema"
import {BigInt, log} from "@graphprotocol/graph-ts";

/*
 * The logNewAnswer event has always the answer except if it is a commitment.
 *
 * For that reason we need to save the answer in this event and in submitAnswerReveal().
 *
 * question.finalize_ts and question.answer are updated in _updateCurrentAnswer() and _updateCurrentAnswerByArbitrator()
 *
 * _updateCurrentAnswer is called by submitAnswer, submitAnswerFor and submitAnswerReveal (conditionally)
 *
 * _updateCurrentAnswerByArbitrator is called by submitAnswerByArbitrator
 */

/**
 * emitted by _addAnswerToHistory()
 */
export function handleLogNewAnswer(event: LogNewAnswer): void {
  if (event.params.is_commitment) {
    // if it's a commitment we need to save the answer once it's revealed in submitAnswerReveal()
    return;
  }

  let question = Question.load(event.params.question_id.toHexString());

  if (question === null) {
    log.error(`handleLogNewAnswer: question ${event.params.question_id.toString()} not found`, [])
    return;
  }

  question.answer = event.params.answer;

  question.save();
}

/**
 * emitted by askQuestion()
 */
export function handleLogNewQuestion(event: LogNewQuestion): void {
  const question = new Question(event.params.question_id.toHexString());

  question.answer = null;
  question.timeout = event.params.timeout;
  question.finalize_ts = BigInt.zero();

  question.save();
}

/**
 * Calls _addAnswerToHistory() and updates question.bond
 */
export function handleSubmitAnswer(call: SubmitAnswerCall): void {
  let question = Question.load(call.inputs.question_id.toHexString());

  if (question === null) {
    log.error(`handleSubmitAnswer: question ${call.inputs.question_id.toString()} not found`, [])
    return;
  }

  question.finalize_ts = call.block.timestamp.plus(question.timeout);
  question.bond = call.transaction.value;

  question.save();
}

/**
 * Calls _addAnswerToHistory() and updates question.bond
 */
export function handleSubmitAnswerFor(call: SubmitAnswerForCall): void {
  let question = Question.load(call.inputs.question_id.toHexString());

  if (question === null) {
    log.error(`handleSubmitAnswerFor: question ${call.inputs.question_id.toString()} not found`, [])
    return;
  }

  question.finalize_ts = call.block.timestamp.plus(question.timeout);
  question.bond = call.transaction.value;

  question.save();
}

/**
 * This does not call _addAnswerToHistory() because the answer was passed previously as a commitment
 */
export function handleSubmitAnswerReveal(call: SubmitAnswerRevealCall): void {
  let question = Question.load(call.inputs.question_id.toHexString());

  if (question === null) {
    log.error(`handleSubmitAnswerReveal: question ${call.inputs.question_id.toString()} not found`, [])
    return;
  }

  if (call.inputs.bond.equals(question.bond)) {
    question.answer = call.inputs.answer;
    question.finalize_ts = call.block.timestamp.plus(question.timeout);

    question.save();
  }
}

/**
 * Calls _addAnswerToHistory()
 */
export function handleSubmitAnswerByArbitrator(call: SubmitAnswerByArbitratorCall): void {
  let question = Question.load(call.inputs.question_id.toHexString());

  if (question === null) {
    log.error(`handleSubmitAnswerByArbitrator: question ${call.inputs.question_id.toString()} not found`, [])
    return;
  }

  question.finalize_ts = call.block.timestamp;

  question.save();
}

/**
 * Updates question.bond
 */
export function handleSubmitAnswerCommitment(call: SubmitAnswerCommitmentCall): void {
  let question = Question.load(call.inputs.question_id.toHexString());

  if (question === null) {
    log.error(`handleSubmitAnswerCommitment: question ${call.inputs.question_id.toString()} not found`, [])
    return;
  }

  question.bond = call.transaction.value;

  question.save();
}
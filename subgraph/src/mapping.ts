import {
  LogNewAnswer,
  LogNewQuestion,
} from "../generated/RealityETHV30/RealityETHV30"
import { Question } from "../generated/schema"
import {log} from "@graphprotocol/graph-ts";

export function handleLogNewAnswer(event: LogNewAnswer): void {
  let question = Question.load(event.params.question_id.toHex());

  if (question === null) {
    log.debug(`handleLogNewAnswer: question ${event.params.question_id.toString()} not found`, [])
    return;
  }

  question.answer = event.params.answer;

  question.save();
}

export function handleLogNewQuestion(event: LogNewQuestion): void {
  let question = new Question(event.params.question_id.toHex());

  question.user = event.params.user;
  question.template_id = event.params.template_id;
  question.question = event.params.question;
  question.content_hash = event.params.content_hash;
  question.arbitrator = event.params.arbitrator;
  question.timeout = event.params.timeout;
  question.opening_ts = event.params.opening_ts;
  question.nonce = event.params.nonce;
  question.created = event.params.created;

  question.save()
}
import type { AssessmentAnswers } from "../types/assessment.types";

export function answerQuestion(
  answers: AssessmentAnswers,
  questionId: string,
  optionId: string,
): AssessmentAnswers {
  return { ...answers, [questionId]: optionId };
}

export function hasAnswer(
  answers: AssessmentAnswers,
  questionId: string,
): boolean {
  return typeof answers[questionId] === "string" && answers[questionId].length > 0;
}

export function canAdvance(
  answers: AssessmentAnswers,
  questionId: string,
): boolean {
  return hasAnswer(answers, questionId);
}

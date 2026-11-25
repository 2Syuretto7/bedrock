"use server";

import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { blockHtml, displayOrder, findQuestion } from "@/lib/lessons/content";
import { grade } from "@/lib/lessons/grade";
import { late, secondsFor } from "@/lib/lessons/timing";
import { recordAttempt, saveSnapshot } from "./service";
import { masteryOf, weakCheck } from "./standing";
import { clearTutorHistory } from "../tutor/service";

export type AnswerResult = {
  correct: boolean;
  note?: string;
  explanationHtml?: string;
  lessonComplete: boolean;
  /** Every question is solved, but the finish was weak: the lesson stays open for its consolidation set. */
  held?: boolean;
  /** Mastery of the lesson as it is finished, from 0 to 100. */
  mastery?: number;
};

async function learner() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Signed out");
  return user;
}

const clean = (value: unknown, max: number) => String(value ?? "").slice(0, max);

const TIME_UP = "Time was up before this answer arrived. Start the question again when you are ready.";
/** Time is kept only for timed (System One) questions. For the rest it is neither measured nor stored. */
const kept = (question: Parameters<typeof secondsFor>[0], ms: number) => (secondsFor(question) === null ? null : Number(ms) || 0);

/** Mastery of a unit at the moment it is finished, as a whole percentage. */
async function finishedMastery(userId: string, unitId: string, complete: boolean): Promise<number | undefined> {
  if (!complete) return undefined;
  const value = await masteryOf(getDb(), userId, unitId);
  return value === null ? undefined : Math.round(value * 100);
}

/** Grades a numeric, choice, predict or order answer on the server and records the attempt. */
export async function submitAnswer(conceptId: string, questionId: string, answer: unknown, ms: number): Promise<AnswerResult> {
  const user = await learner();
  const { unitId, questions, question } = findQuestion(clean(conceptId, 200), clean(questionId, 200));
  if (question.type === "code") throw new Error("Code answers are checked by their tests");

  // The browser speaks in screen positions; translate them back to the lesson's own order.
  const order = displayOrder(unitId, question);
  let given: unknown = answer;
  if (question.type === "choice") given = typeof answer === "number" ? order[answer] : undefined;
  else if (question.type === "order") given = Array.isArray(answer) ? answer.slice(0, 8).map((position) => order[Number(position)]) : undefined;
  else given = clean(answer, 4000);

  // A timed question answered after its time is up is not solved, whatever the answer.
  const verdict = late(question, Number(ms)) ? { correct: false, note: TIME_UP } : grade(question, given);
  const outcome = await recordAttempt(
    getDb(),
    user.id,
    { conceptId: unitId, questionId: question.id, system: question.system, correct: verdict.correct, answer: given ?? null, ms: kept(question, ms) },
    questions.map((q) => q.id),
    weakCheck(unitId),
  );
  return {
    correct: verdict.correct,
    note: verdict.note,
    explanationHtml: verdict.correct ? blockHtml(question.explanation) : undefined,
    ...outcome,
    mastery: await finishedMastery(user.id, unitId, outcome.lessonComplete),
  };
}

/** The checks for a code question. They run in the learner's browser, next to their code. */
export async function codeTests(conceptId: string, questionId: string): Promise<string> {
  await learner();
  const { question } = findQuestion(clean(conceptId, 200), clean(questionId, 200));
  if (question.type !== "code") throw new Error("Not a code question");
  return question.tests;
}

/** Records the outcome of running a code question's checks. */
export async function reportCode(conceptId: string, questionId: string, passed: boolean, code: string, ms: number): Promise<AnswerResult> {
  const user = await learner();
  const { unitId, questions, question } = findQuestion(clean(conceptId, 200), clean(questionId, 200));
  if (question.type !== "code") throw new Error("Not a code question");
  const tooLate = late(question, Number(ms));
  const correct = passed === true && !tooLate;
  const outcome = await recordAttempt(
    getDb(),
    user.id,
    { conceptId: unitId, questionId: question.id, system: question.system, correct, answer: clean(code, 50_000), ms: kept(question, ms) },
    questions.map((q) => q.id),
    weakCheck(unitId),
  );
  return {
    correct,
    note: tooLate ? TIME_UP : undefined,
    explanationHtml: correct ? blockHtml(question.explanation) : undefined,
    ...outcome,
    mastery: await finishedMastery(user.id, unitId, outcome.lessonComplete),
  };
}

/** Records that a timed question's time ran out before it was answered. */
export async function timeUp(conceptId: string, questionId: string): Promise<void> {
  const user = await learner();
  const { unitId, questions, question } = findQuestion(clean(conceptId, 200), clean(questionId, 200));
  const seconds = secondsFor(question);
  if (seconds === null) return;
  await recordAttempt(
    getDb(),
    user.id,
    { conceptId: unitId, questionId: question.id, system: question.system, correct: false, answer: { timedOut: true }, ms: seconds * 1000 },
    questions.map((q) => q.id),
  );
}

export async function saveCode(key: string, code: string): Promise<void> {
  const user = await learner();
  await saveSnapshot(getDb(), user.id, clean(key, 300), clean(code, 50_000));
}

/** Starts the tutor's conversation on a lesson afresh. */
export async function clearTutor(conceptId: string): Promise<void> {
  const user = await learner();
  await clearTutorHistory(getDb(), user.id, clean(conceptId, 200));
}

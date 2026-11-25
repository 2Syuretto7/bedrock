"use server";

import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { blockHtml, displayOrder, findQuestion } from "@/lib/lessons/content";
import { grade } from "@/lib/lessons/grade";
import { late, secondsFor } from "@/lib/lessons/timing";
import { recordAttempt, saveSnapshot, sinceStart, startQuestion } from "./service";
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
const NOT_STARTED = "This question's time has not started. Press Start first.";

/**
 * How long a timed (System One) question has been open, measured by the server from when Start was pressed.
 * `null` for an untimed question, whose time is neither measured nor stored; `undefined` if it was never started.
 */
async function timeTaken(userId: string, unitId: string, question: Parameters<typeof secondsFor>[0] & { id: string }) {
  if (secondsFor(question) === null) return null;
  return (await sinceStart(getDb(), userId, unitId, question.id)) ?? undefined;
}

/** Starts a timed question's clock on the server. The question is shown only once this has returned. */
export async function startTimed(conceptId: string, questionId: string): Promise<void> {
  const user = await learner();
  const { unitId, question } = findQuestion(clean(conceptId, 200), clean(questionId, 200));
  if (secondsFor(question) === null) return;
  await startQuestion(getDb(), user.id, unitId, question.id);
}

/** Mastery of a unit at the moment it is finished, as a whole percentage. */
async function finishedMastery(userId: string, unitId: string, complete: boolean): Promise<number | undefined> {
  if (!complete) return undefined;
  const value = await masteryOf(getDb(), userId, unitId);
  return value === null ? undefined : Math.round(value * 100);
}

/** Grades a numeric, choice, predict or order answer on the server and records the attempt. */
export async function submitAnswer(conceptId: string, questionId: string, answer: unknown): Promise<AnswerResult> {
  const user = await learner();
  const { unitId, questions, question } = findQuestion(clean(conceptId, 200), clean(questionId, 200));
  if (question.type === "code") throw new Error("Code answers are checked by their tests");
  const ms = await timeTaken(user.id, unitId, question);
  if (ms === undefined) return { correct: false, note: NOT_STARTED, lessonComplete: false };

  // The browser speaks in screen positions; translate them back to the lesson's own order.
  const order = displayOrder(unitId, question);
  let given: unknown = answer;
  if (question.type === "choice") given = typeof answer === "number" ? order[answer] : undefined;
  else if (question.type === "order") given = Array.isArray(answer) ? answer.slice(0, 8).map((position) => order[Number(position)]) : undefined;
  else given = clean(answer, 4000);

  // A timed question answered after its time is up is not solved, whatever the answer.
  const verdict = ms !== null && late(question, ms) ? { correct: false, note: TIME_UP } : grade(question, given);
  const outcome = await recordAttempt(
    getDb(),
    user.id,
    { conceptId: unitId, questionId: question.id, system: question.system, correct: verdict.correct, answer: given ?? null, ms },
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
export async function reportCode(conceptId: string, questionId: string, passed: boolean, code: string): Promise<AnswerResult> {
  const user = await learner();
  const { unitId, questions, question } = findQuestion(clean(conceptId, 200), clean(questionId, 200));
  if (question.type !== "code") throw new Error("Not a code question");
  const ms = await timeTaken(user.id, unitId, question);
  if (ms === undefined) return { correct: false, note: NOT_STARTED, lessonComplete: false };
  const tooLate = ms !== null && late(question, ms);
  const correct = passed === true && !tooLate;
  const outcome = await recordAttempt(
    getDb(),
    user.id,
    { conceptId: unitId, questionId: question.id, system: question.system, correct, answer: clean(code, 50_000), ms },
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
  // Only a question that was started can run out of time.
  if (seconds === null || (await sinceStart(getDb(), user.id, unitId, question.id)) === null) return;
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

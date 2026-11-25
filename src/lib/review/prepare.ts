import "server-only";
import type { Db } from "../db";
import { content } from "../lessons/content";
import { questionsOf } from "../lessons/load";
import { tutorConnected } from "../tutor/config";
import { writeReviewQuestion } from "./generate";
import { askModel } from "./model";
import { fingerprint, summary } from "./question";
import { keepQuestion, questionsWritten, showIn, waitingQuestion, type StoredQuestion } from "./service";

/** Work on one learner's questions for one idea happens one step at a time, so two questions written together cannot be the same. */
const queues = new Map<string, Promise<unknown>>();

function inTurn<T>(key: string, work: () => Promise<T>): Promise<T> {
  const turn = (queues.get(key) ?? Promise.resolve()).then(work, work);
  const settled = turn.catch(() => {});
  queues.set(key, settled);
  void settled.then(() => {
    if (queues.get(key) === settled) queues.delete(key);
  });
  return turn;
}

/** Writes a question on an idea that the learner has never had, and keeps it. Null if none could be written. */
async function writeNew(db: Db, userId: string, conceptId: string, consolidates?: string): Promise<StoredQuestion | null> {
  const { graph, lessons } = content();
  const lesson = lessons.get(conceptId);
  if (!lesson || !tutorConnected()) return null;
  const written = await questionsWritten(db, userId, conceptId);
  const taken = new Set([...written.map((row) => row.fingerprint), ...questionsOf(lesson).map(fingerprint)]);
  const fresh = await writeReviewQuestion({ graph, lesson, earlier: written.map((row) => summary(row.question)), taken }, askModel);
  return fresh.question ? keepQuestion(db, userId, conceptId, fresh, consolidates) : null;
}

const quietly = (error: unknown) => {
  console.error("recall", error instanceof Error ? error.name : "error");
  return null;
};

/**
 * One fresh question on an idea, placed in a lesson's Recall part: a question
 * written ahead and still unanswered if there is one, otherwise a new one
 * written now. Returns null when none could be written, for example when the
 * model is not connected. An answered question is never used again.
 */
export function placeQuestion(db: Db, userId: string, conceptId: string, lessonId: string): Promise<StoredQuestion | null> {
  return inTurn(`${userId}:${conceptId}`, async () => {
    const question = (await waitingQuestion(db, userId, conceptId, lessonId)) ?? (await writeNew(db, userId, conceptId));
    if (question) await showIn(db, userId, question.id, lessonId);
    return question;
  }).catch(quietly);
}

/** Writes a question on an idea ahead of time, unless one is already waiting to be placed. */
export function writeAhead(db: Db, userId: string, conceptId: string, lessonId: string): Promise<StoredQuestion | null> {
  return inTurn(`${userId}:${conceptId}`, async () => (await waitingQuestion(db, userId, conceptId, lessonId)) ?? (await writeNew(db, userId, conceptId))).catch(quietly);
}

/**
 * Writes one more question for a lesson's consolidation set: a fresh question on
 * that same lesson, placed in it as it is written. Null if none could be written.
 */
export function consolidationQuestion(db: Db, userId: string, lessonId: string): Promise<StoredQuestion | null> {
  return inTurn(`${userId}:${lessonId}`, () => writeNew(db, userId, lessonId, lessonId)).catch(quietly);
}

import "server-only";
import { capstoneCluster, capstoneQuestions, isCapstoneId } from "../capstones/schema";
import type { Db } from "../db";
import { content } from "../lessons/content";
import { questionsOf } from "../lessons/load";
import { secondsFor } from "../lessons/timing";
import { freshAnswers, memoriesOf, rememberLesson, shownIn } from "../review/service";
import { tutorConnected } from "../tutor/config";
import { CONSOLIDATION_SIZE, freshEvidence, lessonEvidence, mastery, weakFinish, type Answered, type Evidence } from "./mastery";
import { allAttempts, attemptsIn, completeUnit, type AttemptRow } from "./service";

/** The time limit of each question in a lesson or a mini-capstone: null for an untimed (System Two) question. */
function limits(unitId: string): Map<string, number | null> {
  const { lessons, capstones } = content();
  const lesson = lessons.get(unitId);
  const capstone = isCapstoneId(unitId) ? capstones.get(capstoneCluster(unitId)) : undefined;
  const questions = lesson ? questionsOf(lesson) : capstone ? capstoneQuestions(capstone) : [];
  return new Map(questions.map((q) => [q.id, secondsFor(q)]));
}

const withLimits = (unitId: string, rows: AttemptRow[]): Answered[] => {
  const seconds = limits(unitId);
  return rows.map((row) => ({ ...row, seconds: seconds.get(row.questionId) ?? null }));
};

/**
 * The test for a weak finish, given to `recordAttempt`. Only a lesson can finish
 * weakly, and only while the model that writes its consolidation set is
 * connected: otherwise the lesson would be held open with no way to close it.
 */
export function weakCheck(unitId: string): ((rows: AttemptRow[]) => boolean) | undefined {
  if (!content().lessons.has(unitId) || !tutorConnected()) return undefined;
  return (rows) => weakFinish(withLimits(unitId, rows), new Date());
}

/** Mastery of every lesson the learner has answered anything in, from 0 to 1. */
export async function masteryByLesson(db: Db, userId: string, now = new Date()): Promise<Map<string, number>> {
  const [attempts, fresh, memories] = await Promise.all([allAttempts(db, userId), freshAnswers(db, userId), memoriesOf(db, userId)]);
  const rows = new Map<string, AttemptRow[]>();
  for (const attempt of attempts) rows.set(attempt.conceptId, [...(rows.get(attempt.conceptId) ?? []), attempt]);
  const evidence = new Map<string, Evidence[]>();
  for (const [id, own] of rows) evidence.set(id, lessonEvidence(withLimits(id, own)));
  // Fresh recall and consolidation questions are evidence about the lesson they were written on.
  for (const answer of fresh) {
    const item = freshEvidence({ ...answer, seconds: secondsFor({ system: "s1", type: answer.type }) });
    evidence.set(answer.conceptId, [...(evidence.get(answer.conceptId) ?? []), item]);
  }
  const memory = new Map(memories.map((row) => [row.conceptId, row]));
  const result = new Map<string, number>();
  for (const [id, items] of evidence) {
    const value = mastery(items, now, memory.get(id));
    if (value !== null) result.set(id, value);
  }
  return result;
}

/** Mastery of one lesson now, or null if nothing in it has been answered. */
export const masteryOf = async (db: Db, userId: string, lessonId: string) => (await masteryByLesson(db, userId)).get(lessonId) ?? null;

/**
 * Finishes a lesson that was held open for its consolidation set, once every
 * question of the set has been answered. The lesson's first recall then comes
 * in about a day rather than about four, unless most of the set was recalled.
 */
export async function finishConsolidated(db: Db, userId: string, lessonId: string): Promise<boolean> {
  const set = await shownIn(db, userId, lessonId, "consolidation");
  if (set.filter((row) => row.answered).length < CONSOLIDATION_SIZE) return false;
  const solved = new Set((await attemptsIn(db, userId, lessonId)).filter((row) => row.correct).map((row) => row.questionId));
  if (![...limits(lessonId).keys()].every((id) => solved.has(id))) return false;
  const recalled = set.filter((row) => row.correct).length;
  await completeUnit(db, userId, lessonId);
  await rememberLesson(db, userId, lessonId, new Date(), recalled * 2 < CONSOLIDATION_SIZE + 1);
  return true;
}

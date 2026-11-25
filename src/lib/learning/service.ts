import { and, asc, eq, isNotNull, like, sql } from "drizzle-orm";
import { capstoneCluster, isCapstoneId } from "../capstones/schema";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../db/schema";

type Db = NodePgDatabase<typeof schema>;
const { attempts, lessonProgress, codeSnapshots, tutorMessages } = schema;

export type AttemptInput = {
  conceptId: string;
  questionId: string;
  system: "s1" | "s2";
  correct: boolean;
  answer: unknown;
  ms: number | null;
};

export type AttemptRow = { questionId: string; correct: boolean; hintsUsed: number; ms: number | null; at: Date };

/** Every answer the learner has given in a lesson or a mini-capstone, oldest first. */
export async function attemptsIn(db: Db, userId: string, conceptId: string): Promise<AttemptRow[]> {
  return db
    .select({ questionId: attempts.questionId, correct: attempts.correct, hintsUsed: attempts.hintsUsed, ms: attempts.ms, at: attempts.createdAt })
    .from(attempts)
    .where(and(eq(attempts.userId, userId), eq(attempts.conceptId, conceptId)))
    .orderBy(asc(attempts.id));
}

/** Every answer the learner has given anywhere, oldest first. */
export async function allAttempts(db: Db, userId: string): Promise<(AttemptRow & { conceptId: string })[]> {
  return db
    .select({ conceptId: attempts.conceptId, questionId: attempts.questionId, correct: attempts.correct, hintsUsed: attempts.hintsUsed, ms: attempts.ms, at: attempts.createdAt })
    .from(attempts)
    .where(eq(attempts.userId, userId))
    .orderBy(asc(attempts.id));
}

/** Marks a lesson or mini-capstone finished, if it is not already. */
export async function completeUnit(db: Db, userId: string, conceptId: string) {
  await db
    .update(lessonProgress)
    .set({ completedAt: sql`coalesce(${lessonProgress.completedAt}, now())` })
    .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.conceptId, conceptId)));
}

/**
 * Stores one answer. `lessonQuestions` are all the question ids in the lesson.
 * Once every one has a correct attempt the unit is finished, unless `weak`
 * says the finish was a weak one: then it is held open (`held`) for its
 * consolidation set, and whoever runs that set finishes the unit.
 */
export async function recordAttempt(
  db: Db,
  userId: string,
  input: AttemptInput,
  lessonQuestions: string[],
  weak?: (answers: AttemptRow[]) => boolean,
): Promise<{ lessonComplete: boolean; held?: boolean }> {
  const { conceptId, questionId } = input;
  // The only hints are the tutor's. Each attempt keeps how many the learner had been given on the question by then.
  const [hints] = await db
    .select({ given: sql<string>`count(*)` })
    .from(tutorMessages)
    .where(and(eq(tutorMessages.userId, userId), eq(tutorMessages.conceptId, conceptId), eq(tutorMessages.questionId, questionId), eq(tutorMessages.hint, true)));
  await db.insert(lessonProgress).values({ userId, conceptId }).onConflictDoNothing();
  await db.insert(attempts).values({
    userId,
    conceptId,
    questionId,
    system: input.system,
    correct: input.correct,
    answer: input.answer ?? null,
    hintsUsed: Number(hints?.given ?? 0),
    ms: input.ms === null ? null : Math.max(0, Math.min(Math.round(input.ms), 86_400_000)),
  });
  if (!input.correct) return { lessonComplete: false };
  const solved = await solvedQuestions(db, userId, conceptId);
  if (!lessonQuestions.every((id) => solved.has(id))) return { lessonComplete: false };
  const [progress] = await db
    .select({ completedAt: lessonProgress.completedAt })
    .from(lessonProgress)
    .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.conceptId, conceptId)));
  if (progress?.completedAt) return { lessonComplete: true };
  if (weak?.(await attemptsIn(db, userId, conceptId))) return { lessonComplete: false, held: true };
  await completeUnit(db, userId, conceptId);
  return { lessonComplete: true };
}

export async function solvedQuestions(db: Db, userId: string, conceptId: string): Promise<Set<string>> {
  const rows = await db
    .selectDistinct({ id: attempts.questionId })
    .from(attempts)
    .where(and(eq(attempts.userId, userId), eq(attempts.conceptId, conceptId), eq(attempts.correct, true)));
  return new Set(rows.map((row) => row.id));
}

async function completedUnits(db: Db, userId: string): Promise<string[]> {
  const rows = await db
    .select({ id: lessonProgress.conceptId })
    .from(lessonProgress)
    .where(and(eq(lessonProgress.userId, userId), isNotNull(lessonProgress.completedAt)))
    .orderBy(asc(lessonProgress.completedAt), asc(lessonProgress.startedAt));
  return rows.map((row) => row.id);
}

/** Completed concepts, oldest first. The last one is the lesson the next must build on. */
export async function completedConcepts(db: Db, userId: string): Promise<string[]> {
  return (await completedUnits(db, userId)).filter((id) => !isCapstoneId(id));
}

/** The clusters whose mini-capstone is finished. They are kept apart from lessons so they never change which lesson comes next. */
export async function completedCapstones(db: Db, userId: string): Promise<Set<string>> {
  return new Set((await completedUnits(db, userId)).filter(isCapstoneId).map(capstoneCluster));
}

export async function saveSnapshot(db: Db, userId: string, key: string, code: string) {
  await db
    .insert(codeSnapshots)
    .values({ userId, key, code })
    .onConflictDoUpdate({ target: [codeSnapshots.userId, codeSnapshots.key], set: { code, updatedAt: sql`now()` } });
}

export async function snapshotsFor(db: Db, userId: string, prefix: string) {
  const rows = await db
    .select({ key: codeSnapshots.key, code: codeSnapshots.code, updatedAt: codeSnapshots.updatedAt })
    .from(codeSnapshots)
    .where(and(eq(codeSnapshots.userId, userId), like(codeSnapshots.key, `${prefix.replace(/[%_\\]/g, "\\$&")}%`)));
  return Object.fromEntries(rows.map((row) => [row.key, { code: row.code, at: row.updatedAt.getTime() }]));
}

import { and, asc, eq, isNotNull, isNull, lte } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { isCapstoneId } from "../capstones/schema";
import * as schema from "../db/schema";
import { gradeReview, reviewQuestion, type ReviewQuestion } from "./question";
import { afterReview, firstMemory, type Memory } from "./schedule";

type Db = NodePgDatabase<typeof schema>;
const { reviewStates, reviewQuestions, lessonProgress } = schema;

const memoryOf = (row: typeof reviewStates.$inferSelect): Memory => ({
  stability: row.stability,
  difficulty: row.difficulty,
  reps: row.reps,
  lapses: row.lapses,
  lastReviewedAt: row.lastReviewedAt,
  dueAt: row.dueAt,
});

/** Starts a lesson's memory at the moment it is finished. A weak finish brings it back sooner. */
export async function rememberLesson(db: Db, userId: string, conceptId: string, finishedAt: Date, weak: boolean) {
  await db
    .insert(reviewStates)
    .values({ userId, conceptId, ...firstMemory(finishedAt, weak) })
    .onConflictDoNothing();
}

/** Every fresh question the learner has answered, for working out mastery. */
export async function freshAnswers(db: Db, userId: string) {
  const rows = await db
    .select({ conceptId: reviewQuestions.conceptId, question: reviewQuestions.question, correct: reviewQuestions.correct, ms: reviewQuestions.ms, at: reviewQuestions.answeredAt })
    .from(reviewQuestions)
    .where(and(eq(reviewQuestions.userId, userId), isNotNull(reviewQuestions.answeredAt)));
  return rows.map((row) => ({ conceptId: row.conceptId, type: reviewQuestion.parse(row.question).type, correct: row.correct === true, ms: row.ms, at: row.at! }));
}

/**
 * Gives every finished lesson a memory, dated from the moment it was finished.
 * Lessons finished before reviews existed are picked up the same way, so nothing has to be migrated.
 */
export async function rememberFinishedLessons(db: Db, userId: string) {
  const finished = await db
    .select({ id: lessonProgress.conceptId, at: lessonProgress.completedAt })
    .from(lessonProgress)
    .where(and(eq(lessonProgress.userId, userId), isNotNull(lessonProgress.completedAt)));
  const lessons = finished.filter((row) => !isCapstoneId(row.id));
  if (lessons.length === 0) return;
  await db
    .insert(reviewStates)
    .values(lessons.map((row) => ({ userId, conceptId: row.id, ...firstMemory(row.at!) })))
    .onConflictDoNothing();
}

/** Where every finished lesson stands in the recall schedule, the one due soonest first. */
export async function memoriesOf(db: Db, userId: string) {
  return db.select().from(reviewStates).where(eq(reviewStates.userId, userId)).orderBy(asc(reviewStates.dueAt), asc(reviewStates.conceptId));
}

/** Every lesson that is due at `at`, or will be by then. */
export async function dueBy(db: Db, userId: string, at: Date) {
  return db
    .select()
    .from(reviewStates)
    .where(and(eq(reviewStates.userId, userId), lte(reviewStates.dueAt, at)))
    .orderBy(asc(reviewStates.dueAt));
}

export type StoredQuestion = { id: number; conceptId: string; question: ReviewQuestion };

/**
 * A question written for an idea and not yet answered, which is not already in the lesson `notIn`.
 * One that has not been placed in any lesson comes first.
 */
export async function waitingQuestion(db: Db, userId: string, conceptId: string, notIn?: string): Promise<StoredQuestion | null> {
  const rows = await db
    .select({ id: reviewQuestions.id, conceptId: reviewQuestions.conceptId, question: reviewQuestions.question, shownIn: reviewQuestions.shownIn })
    .from(reviewQuestions)
    .where(and(eq(reviewQuestions.userId, userId), eq(reviewQuestions.conceptId, conceptId), eq(reviewQuestions.purpose, "recall"), isNull(reviewQuestions.answeredAt)))
    .orderBy(asc(reviewQuestions.id));
  const free = rows.filter((row) => row.shownIn !== notIn || notIn === undefined);
  const row = free.find((candidate) => candidate.shownIn === null) ?? free[0];
  return row ? { id: row.id, conceptId: row.conceptId, question: reviewQuestion.parse(row.question) } : null;
}

/** Puts a waiting question in the Recall part of a lesson. It stays there, answered or not, on every later visit. */
export async function showIn(db: Db, userId: string, questionId: number, lessonId: string) {
  await db
    .update(reviewQuestions)
    .set({ shownIn: lessonId })
    .where(and(eq(reviewQuestions.id, questionId), eq(reviewQuestions.userId, userId), isNull(reviewQuestions.answeredAt)));
}

export type ShownQuestion = StoredQuestion & { answered: boolean; correct: boolean | null };

/** The fresh questions in a lesson's Recall part, or in its consolidation set, in the order they were written. */
export async function shownIn(db: Db, userId: string, lessonId: string, purpose: "recall" | "consolidation" = "recall"): Promise<ShownQuestion[]> {
  const rows = await db
    .select()
    .from(reviewQuestions)
    .where(and(eq(reviewQuestions.userId, userId), eq(reviewQuestions.shownIn, lessonId), eq(reviewQuestions.purpose, purpose)))
    .orderBy(asc(reviewQuestions.id));
  return rows.map((row) => ({
    id: row.id,
    conceptId: row.conceptId,
    question: reviewQuestion.parse(row.question),
    answered: row.answeredAt !== null,
    correct: row.correct,
  }));
}

/** Every review question ever written for a lesson, oldest first, with its fingerprint. */
export async function questionsWritten(db: Db, userId: string, conceptId: string) {
  const rows = await db
    .select({ question: reviewQuestions.question, fingerprint: reviewQuestions.fingerprint })
    .from(reviewQuestions)
    .where(and(eq(reviewQuestions.userId, userId), eq(reviewQuestions.conceptId, conceptId)))
    .orderBy(asc(reviewQuestions.id));
  return rows.map((row) => ({ question: reviewQuestion.parse(row.question), fingerprint: row.fingerprint }));
}

/**
 * Keeps a newly written question. Returns null if it could not be kept because
 * the same question was written for this idea before.
 */
export async function keepQuestion(
  db: Db,
  userId: string,
  conceptId: string,
  written: { question: ReviewQuestion; fingerprint: string; costMicroUsd: number },
  /** Set for a question of a lesson's consolidation set, which is placed in that lesson as it is written. */
  consolidates?: string,
): Promise<StoredQuestion | null> {
  const [row] = await db
    .insert(reviewQuestions)
    .values({
      userId,
      conceptId,
      question: written.question,
      fingerprint: written.fingerprint,
      costMicroUsd: written.costMicroUsd,
      ...(consolidates ? { purpose: "consolidation" as const, shownIn: consolidates } : {}),
    })
    .onConflictDoNothing()
    .returning({ id: reviewQuestions.id });
  return row ? { id: row.id, conceptId, question: written.question } : null;
}

export type ReviewOutcome = {
  correct: boolean;
  note?: string;
  question: ReviewQuestion;
  conceptId: string;
  nextDueAt: Date;
  purpose: "recall" | "consolidation";
};

/**
 * Marks the one answer a review question gets, and moves the lesson's next review.
 * `read` turns what the browser sent into the question's own terms (an option's index, not its place on screen).
 * Returns null if the question is not this learner's or has been answered already.
 */
export async function answerReview(db: Db, userId: string, questionId: number,
  read: (question: ReviewQuestion) => unknown,
  ms: number | null,
  now = new Date(),
  /** Whether the question's time had run out. If so it is a miss, whatever was sent. */
  isLate: (question: ReviewQuestion) => boolean = () => false,
): Promise<ReviewOutcome | null> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(reviewQuestions)
      .where(and(eq(reviewQuestions.id, questionId), eq(reviewQuestions.userId, userId), isNull(reviewQuestions.answeredAt)))
      .for("update");
    if (!row) return null;
    const question = reviewQuestion.parse(row.question);
    const timedOut = isLate(question);
    const given = timedOut ? { timedOut: true } : read(question);
    const verdict = timedOut ? { correct: false } : gradeReview(question, given);
    // Something that is not an answer at all, such as letters where a number belongs, does not use up the one try.
    if (!timedOut && !verdict.correct && verdict.note) return { correct: false, note: verdict.note, question, conceptId: row.conceptId, nextDueAt: now, purpose: row.purpose };

    await tx
      .update(reviewQuestions)
      .set({
        answeredAt: now,
        correct: verdict.correct,
        answer: given ?? null,
        ms: ms === null ? null : Math.max(0, Math.min(Math.round(ms), 86_400_000)),
      })
      .where(eq(reviewQuestions.id, questionId));

    // A consolidation question belongs to a lesson that is not finished yet, so it has no place in the recall schedule to move.
    if (row.purpose === "consolidation") return { correct: verdict.correct, question, conceptId: row.conceptId, nextDueAt: now, purpose: row.purpose };

    const key = and(eq(reviewStates.userId, userId), eq(reviewStates.conceptId, row.conceptId));
    const [state] = await tx.select().from(reviewStates).where(key).for("update");
    const before = state ? memoryOf(state) : firstMemory(row.createdAt);
    const after = afterReview(before, verdict.correct, now);
    await tx
      .insert(reviewStates)
      .values({ userId, conceptId: row.conceptId, ...after })
      .onConflictDoUpdate({ target: [reviewStates.userId, reviewStates.conceptId], set: after });
    return { correct: verdict.correct, question, conceptId: row.conceptId, nextDueAt: after.dueAt, purpose: row.purpose };
  });
}

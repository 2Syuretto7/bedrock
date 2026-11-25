import { and, asc, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../db/schema";
import type { About } from "./turn";

type Db = NodePgDatabase<typeof schema>;
const { tutorMessages, attempts } = schema;

export type TutorMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  /** On a reply: the tutor's judgement of the message it answered. Absent on replies from before it made one. */
  about?: About | null;
  questionId?: string | null;
  hint?: boolean;
};

/** The conversation on one lesson, oldest first, at most `limit` of the latest messages. */
export async function tutorHistory(db: Db, userId: string, conceptId: string, limit = 60): Promise<TutorMessage[]> {
  const rows = await db
    .select({
      id: tutorMessages.id,
      role: tutorMessages.role,
      content: tutorMessages.content,
      about: tutorMessages.about,
      questionId: tutorMessages.questionId,
      hint: tutorMessages.hint,
    })
    .from(tutorMessages)
    .where(and(eq(tutorMessages.userId, userId), eq(tutorMessages.conceptId, conceptId), isNull(tutorMessages.clearedAt)))
    .orderBy(desc(tutorMessages.id))
    .limit(limit);
  return rows.reverse();
}

export async function saveTutorMessage(
  db: Db,
  userId: string,
  conceptId: string,
  role: "user" | "assistant",
  content: string,
  costMicroUsd = 0,
  judged: { about: About; questionId: string | null; hint: boolean } | null = null,
): Promise<number> {
  const [row] = await db
    .insert(tutorMessages)
    .values({ userId, conceptId, role, content, costMicroUsd, about: judged?.about ?? null, questionId: judged?.questionId ?? null, hint: judged?.hint ?? false })
    .returning({ id: tutorMessages.id });
  return row.id;
}

/** Hides the conversation on one lesson. The rows stay, so what was spent and the hints that were given are still counted. */
export async function clearTutorHistory(db: Db, userId: string, conceptId: string) {
  await db
    .update(tutorMessages)
    .set({ clearedAt: sql`now()` })
    .where(and(eq(tutorMessages.userId, userId), eq(tutorMessages.conceptId, conceptId), isNull(tutorMessages.clearedAt)));
}

/**
 * How many hints the tutor has given on each question of a lesson. These are the only hints
 * there are. Clearing the conversation does not take them back.
 */
export async function tutorHints(db: Db, userId: string, conceptId: string): Promise<Map<string, number>> {
  const rows = await db
    .select({ id: tutorMessages.questionId, given: sql<string>`count(*)` })
    .from(tutorMessages)
    .where(and(eq(tutorMessages.userId, userId), eq(tutorMessages.conceptId, conceptId), eq(tutorMessages.hint, true), isNotNull(tutorMessages.questionId)))
    .groupBy(tutorMessages.questionId);
  return new Map(rows.map((row) => [row.id!, Number(row.given)]));
}

export type Attempt = { correct: boolean; answer: unknown; ms: number | null; at: Date };

/** Every answer the learner has given to each question of a lesson, oldest first. */
export async function attemptHistory(db: Db, userId: string, conceptId: string): Promise<Map<string, Attempt[]>> {
  const rows = await db
    .select({ id: attempts.questionId, correct: attempts.correct, answer: attempts.answer, ms: attempts.ms, at: attempts.createdAt })
    .from(attempts)
    .where(and(eq(attempts.userId, userId), eq(attempts.conceptId, conceptId)))
    .orderBy(asc(attempts.id));
  const history = new Map<string, Attempt[]>();
  for (const { id, ...attempt } of rows) history.set(id, [...(history.get(id) ?? []), attempt]);
  return history;
}

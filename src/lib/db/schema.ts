import { bigint, boolean, doublePrecision, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  passphraseHash: text("passphrase_hash").notNull(),
  createdAt: createdAt(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  userAgent: text("user_agent"),
  createdAt: createdAt(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const loginAttempts = pgTable("login_attempts", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  ipHash: text("ip_hash").notNull(),
  succeeded: boolean("succeeded").notNull(),
  attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull().defaultNow(),
});

export const attempts = pgTable("attempts", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  userId: uuid("user_id").notNull(),
  conceptId: text("concept_id").notNull(),
  questionId: text("question_id").notNull(),
  system: text("system").notNull(),
  correct: boolean("correct").notNull(),
  answer: jsonb("answer"),
  /** How many hints the tutor had given on this question when the answer was submitted. */
  hintsUsed: integer("hints_used").notNull().default(0),
  ms: integer("ms"),
  createdAt: createdAt(),
});

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    userId: uuid("user_id").notNull(),
    conceptId: text("concept_id").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.conceptId] })],
);

export const codeSnapshots = pgTable(
  "code_snapshots",
  {
    userId: uuid("user_id").notNull(),
    key: text("key").notNull(),
    code: text("code").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.key] })],
);

export const tutorMessages = pgTable("tutor_messages", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  userId: uuid("user_id").notNull(),
  conceptId: text("concept_id").notNull(),
  role: text("role").$type<"user" | "assistant">().notNull(),
  content: text("content").notNull(),
  costMicroUsd: bigint("cost_micro_usd", { mode: "number" }).notNull().default(0),
  /** On a reply: what the tutor judged the learner's message to be about. */
  about: text("about").$type<"unsolved" | "solved" | "lesson" | "other">(),
  /** On a reply about a question: that question. */
  questionId: text("question_id"),
  /** True on a reply that gave a hint on a question the learner had not yet solved. */
  hint: boolean("hint").notNull().default(false),
  clearedAt: timestamp("cleared_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const reviewStates = pgTable(
  "review_states",
  {
    userId: uuid("user_id").notNull(),
    conceptId: text("concept_id").notNull(),
    stability: doublePrecision("stability").notNull(),
    difficulty: doublePrecision("difficulty").notNull(),
    reps: integer("reps").notNull().default(0),
    lapses: integer("lapses").notNull().default(0),
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }).notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.conceptId] })],
);

export const reviewQuestions = pgTable("review_questions", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  userId: uuid("user_id").notNull(),
  conceptId: text("concept_id").notNull(),
  question: jsonb("question").notNull(),
  fingerprint: text("fingerprint").notNull(),
  shownIn: text("shown_in"),
  purpose: text("purpose").$type<"recall" | "consolidation">().notNull().default("recall"),
  costMicroUsd: bigint("cost_micro_usd", { mode: "number" }).notNull().default(0),
  createdAt: createdAt(),
  answeredAt: timestamp("answered_at", { withTimezone: true }),
  correct: boolean("correct"),
  answer: jsonb("answer"),
  ms: integer("ms"),
});

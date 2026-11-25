import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/lib/db/schema";
import { signUp } from "@/lib/auth/service";
import {
  completedCapstones,
  completedConcepts,
  recordAttempt,
  saveSnapshot,
  snapshotsFor,
  solvedQuestions,
} from "@/lib/learning/service";
import { saveTutorMessage } from "@/lib/tutor/service";
import { migrate } from "../../scripts/migrate";

const url = process.env.TEST_DATABASE_URL ?? "postgres://bedrock:bedrock@localhost:5432/bedrock_test";
const pool = new Pool({ connectionString: url });
const db = drizzle(pool, { schema });
let userId: string;

beforeAll(async () => {
  await migrate(url, () => {});
});
beforeEach(async () => {
  await pool.query("truncate users, sessions, login_attempts, attempts, lesson_progress, code_snapshots, tutor_messages restart identity cascade");
  const created = await signUp(db, "vitest");
  if (!created.ok) throw new Error("sign-up failed");
  userId = (await pool.query<{ id: string }>("select id from users")).rows[0].id;
});
afterAll(async () => {
  await pool.end();
});

const attempt = (conceptId: string, questionId: string, correct: boolean) =>
  recordAttempt(db, userId, { conceptId, questionId, system: "s1", correct, answer: "x", ms: 1200 }, ["a", "b"]);

describe("recording learning", () => {
  it("completes a lesson only when every question has been answered correctly", async () => {
    expect(await attempt("f0.counting", "a", false)).toEqual({ lessonComplete: false });
    expect(await attempt("f0.counting", "a", true)).toEqual({ lessonComplete: false });
    expect(await completedConcepts(db, userId)).toEqual([]);
    expect(await attempt("f0.counting", "b", true)).toEqual({ lessonComplete: true });
    expect(await solvedQuestions(db, userId, "f0.counting")).toEqual(new Set(["a", "b"]));
    expect(await completedConcepts(db, userId)).toEqual(["f0.counting"]);
  });

  it("lists completed lessons in the order they were finished", async () => {
    for (const concept of ["f0.counting", "s0.printing", "f0.adding"]) {
      await attempt(concept, "a", true);
      await attempt(concept, "b", true);
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    expect(await completedConcepts(db, userId)).toEqual(["f0.counting", "s0.printing", "f0.adding"]);
  });

  it("records a finished mini-capstone apart from the lessons, so it never becomes the lesson the next must build on", async () => {
    for (const unit of ["f0.counting", "capstone.f0", "f0.adding"]) {
      await attempt(unit, "a", true);
      await attempt(unit, "b", true);
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    await attempt("capstone.s0", "a", true);
    expect(await completedConcepts(db, userId)).toEqual(["f0.counting", "f0.adding"]);
    expect(await completedCapstones(db, userId)).toEqual(new Set(["F0"]));
    expect(await solvedQuestions(db, userId, "capstone.s0")).toEqual(new Set(["a"]));
  });

  it("has no hint ladder: the only hints are the tutor's, and each attempt records how many it had given by then", async () => {
    expect((await pool.query("select to_regclass('hint_views') as t")).rows[0].t).toBeNull();
    const reply = (questionId: string | null, hint: boolean, conceptId = "f0.counting") =>
      saveTutorMessage(db, userId, conceptId, "assistant", "x", 0, { about: questionId ? "unsolved" : "lesson", questionId, hint });
    await attempt("f0.counting", "a", false);
    await reply("a", true);
    await reply("a", false); // the tutor judged the learner could do it alone, and gave nothing
    await reply(null, false); // a reply about the lesson, not a question
    await reply("b", true); // a hint on another question
    await reply("a", true, "f0.adding"); // a question with the same id in another lesson
    await attempt("f0.counting", "a", false);
    await reply("a", true);
    await attempt("f0.counting", "a", true);
    expect((await pool.query("select hints_used from attempts order by id")).rows.map((row) => row.hints_used)).toEqual([0, 1, 2]);
  });

  it("keeps the latest code for each editor document", async () => {
    await saveSnapshot(db, userId, "bedrock-code:f0.counting", "print(1)");
    await saveSnapshot(db, userId, "bedrock-code:f0.counting", "print(2)");
    await saveSnapshot(db, userId, "bedrock-code:f0.counting:q", "x = 1");
    await saveSnapshot(db, userId, "bedrock-code:f0.adding", "other");
    const found = await snapshotsFor(db, userId, "bedrock-code:f0.counting");
    expect(Object.keys(found).sort()).toEqual(["bedrock-code:f0.counting", "bedrock-code:f0.counting:q"]);
    expect(found["bedrock-code:f0.counting"].code).toBe("print(2)");
  });
});

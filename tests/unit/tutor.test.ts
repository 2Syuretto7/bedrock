import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/lib/db/schema";
import { signUp } from "@/lib/auth/service";
import { loadGraph } from "@/lib/graph/load";
import { loadLessons } from "@/lib/lessons/load";
import { costMicroUsd, tutorEffort, tutorModel } from "@/lib/tutor/config";
import { systemPrompt, workspaceNote } from "@/lib/tutor/prompt";
import { renderReply } from "@/lib/tutor/render";
import { recordAttempt } from "@/lib/learning/service";
import { attemptHistory, clearTutorHistory, saveTutorMessage, tutorHints, tutorHistory } from "@/lib/tutor/service";
import { parseTurn, TurnReader, turnLine } from "@/lib/tutor/turn";
import { migrate } from "../../scripts/migrate";

const root = path.join(import.meta.dirname, "..", "fixtures");
const graph = loadGraph(path.join(root, "graph"));
const lessons = loadLessons(path.join(root, "content", "lessons"));

describe("what the tutor is told", () => {
  it("places the learner: finished lessons, the lesson in progress and what comes next", () => {
    const text = systemPrompt({ graph, completed: ["f0.counting"], lesson: lessons.get("f0.adding")!, next: "s0.printing" });
    expect(text).toContain("Feynman");
    expect(text).toMatch(/# Finished\n- Foundations, .*: Counting/);
    expect(text).toContain("Lesson: Adding (Foundations,");
    expect(text).toContain("Finished just before it: Counting");
    expect(text).toContain("Comes next: Printing");
    // Lessons are named by title; a concept id never reaches the model.
    expect(text).not.toMatch(/\[\[[a-z0-9.-]+\]\]/);
  });

  it("gives the whole lesson, with answers the tutor is told to keep to itself", () => {
    const text = systemPrompt({ graph, completed: [], lesson: lessons.get("f0.counting")!, next: "f0.adding" });
    expect(text).toContain("None yet. This is the learner's very first lesson");
    expect(text).toContain("A shepherd has no words for numbers.");
    expect(text).toContain("Question 1 (id pebbles, numeric):");
    expect(text).toContain("Answer: 9 sheep");
    expect(text).toContain("Never give the solution.");
    // No prepared hints exist for the tutor to hand out; it writes its own.
    expect(text).not.toMatch(/hint ladder|Hints the learner can ask for/i);
    expect(text).toContain("Next comes Adding");
  });

  it("is identical from one question to the next, so it can be cached", () => {
    const build = () => systemPrompt({ graph, completed: ["f0.counting"], lesson: lessons.get("f0.adding")!, next: "s0.printing" });
    expect(build()).toBe(build());
  });

  it("still works when every written lesson is finished", () => {
    const text = systemPrompt({ graph, completed: [...lessons.keys()], lesson: null, next: null });
    expect(text).toContain("finished every lesson written so far");
    expect(text).toContain("Counting");
  });

  it("describes the screen: progress, the open question, the code and its output", () => {
    const lesson = lessons.get("s0.printing")!;
    const note = workspaceNote(lesson, { questionId: "write-sum", code: "print(1 + 2)\n", output: "3", solved: ["predict-fast"] });
    expect(note).toMatch(/^<workspace>\nQuestions solved so far: \d+ of \d+\./);
    expect(note).toMatch(/attempt at question \d+ \(not solved yet\)/);
    expect(note).toContain("print(1 + 2)");
    expect(note).toContain("Output of the last run:");
    expect(note).toMatch(/Question \d+: not solved yet; not attempted\./);
    expect(workspaceNote(null, {})).toBe("");
    expect(workspaceNote(null, { code: "x".repeat(7000) })).toContain("(cut short here)");
  });
});

describe("how the tutor judges a message", () => {
  const text = systemPrompt({ graph, completed: [], lesson: lessons.get("f0.counting")!, next: "f0.adding" });

  it("is told to work out whether a message is about a question before answering", () => {
    expect(text).toContain("# First, work out what the message is about");
    for (const kind of ["An unsolved question.", "A solved question.", "The lesson, but not a question", "Something else"]) expect(text).toContain(kind);
    expect(text).toContain("Judge by meaning, not by keywords.");
  });

  it("gives hints only when it judges the learner cannot solve the question alone, and never the solution", () => {
    expect(text).toContain("Judge whether the learner can solve it without you");
    expect(text).toContain("If you judge that they can solve it themselves, do not nudge them towards the solution at all.");
    expect(text).toContain("If you judge that they cannot get there on their own from where they stand, nudge them.");
    expect(text).toContain("your hints together must never add up to the solution");
  });

  it("allows open discussion of a question only once it is solved", () => {
    expect(text).toContain("No open discussion of the question until it is solved.");
    expect(text).toMatch(/# A solved question\n\nOpen discussion\./);
  });

  it("is given every answer the learner has tried, the question they are on and the hints already given", () => {
    const lesson = lessons.get("f0.counting")!;
    const now = new Date("2026-01-01T10:10:00Z");
    const at = new Date("2026-01-01T10:08:00Z");
    const note = workspaceNote(lesson, {
      attendingId: "pebbles",
      solved: ["larger"],
      now,
      attempts: new Map([
        ["pebbles", [{ correct: false, answer: "15", ms: 200_000, at }, { correct: false, answer: "8", ms: 220_000, at }]],
        ["larger", [{ correct: false, answer: 0, ms: 3_000, at }, { correct: true, answer: 1, ms: 2_000, at }]],
        ["order-count", [{ correct: false, answer: [1, 0, 2], ms: 9_000, at }]],
      ]),
      hints: new Map([["pebbles", 1]]),
    });
    expect(note).toContain("Question 1: not solved yet; 2 attempts, 2 wrong; 7 min spent; last attempt 2 min ago; 1 hint from you so far.");
    expect(note).toContain('  Its answers, oldest first: "15" (wrong); "8" (wrong).');
    expect(note).toContain('Question 2: solved; 2 attempts, 1 wrong; 5 s spent; last attempt 2 min ago; no hints from you so far.');
    expect(note).toContain('  Its answers, oldest first: "7" (wrong); "11" (right).');
    expect(note).toContain("Its answers, oldest first: the steps in the order 2, 1, 3 (wrong).");
    expect(note).toContain("The question the learner last worked on is question 1 (not solved yet).");
    expect(workspaceNote(lesson, {})).toContain("The learner has not touched a question since opening this page. The first one not solved is question 1.");
  });

  it("knows the fresh recall and consolidation questions, and gives no help with one until it is answered", () => {
    expect(text).toContain("A fresh question that is not yet answered is a test of memory, so you give no help with it of any kind");
    const note = workspaceNote(lessons.get("f0.adding")!, {
      fresh: [
        { purpose: "recall", idea: "Counting", question: { type: "numeric", prompt: "How many sheep?", answer: "11", unit: "sheep" }, answered: false, correct: null },
        { purpose: "recall", idea: "Counting", question: { type: "choice", prompt: "Which is largest?", options: ["3", "8", "5"], answer: 1 }, answered: true, correct: false },
        { purpose: "consolidation", idea: "Adding", question: { type: "predict", prompt: "What does it print?", code: "print(1 + 2)", output: "3" }, answered: true, correct: true },
      ],
    });
    expect(note).toContain("Fresh recall question 1, on Counting (not answered yet: give no help with it):\n  How many sheep?\n  Answer: 11 sheep");
    expect(note).toContain("Fresh recall question 2, on Counting (answered, wrong: open to discussion):\n  Which is largest?\n  Options: 3 | 8 | 5\n  Answer: 8");
    expect(note).toContain("Fresh consolidation question 1, on Adding (answered, right: open to discussion):\n  What does it print?\n  Code:\n    print(1 + 2)\n  It prints: 3");
  });

  it("reads the opening line of a reply and keeps it from the learner", () => {
    expect(parseTurn('<turn about="unsolved" question="2" hint="yes">')).toEqual({ about: "unsolved", question: 2, hint: true });
    expect(parseTurn('<turn about="unsolved" question="2" hint="no">')).toEqual({ about: "unsolved", question: 2, hint: false });
    expect(parseTurn('<turn about="lesson" hint="no">')).toEqual({ about: "lesson", question: null, hint: false });
    // A hint is only ever a hint on an unsolved question.
    expect(parseTurn('<turn about="solved" question="1" hint="yes">')).toEqual({ about: "solved", question: 1, hint: false });
    expect(parseTurn('<turn about="unsolved" hint="yes">')?.hint).toBe(false);
    expect(parseTurn('<turn about="nonsense">')).toBeNull();
    expect(turnLine({ about: "unsolved", question: 2, hint: true })).toBe('<turn about="unsolved" question="2" hint="yes">');

    const read = (...deltas: string[]) => {
      const reader = new TurnReader();
      const shown = deltas.map((delta) => reader.push(delta)).join("") + reader.end();
      return { shown, text: reader.text, turn: reader.turn };
    };
    // However the line is split as it streams, none of it is shown.
    for (const deltas of [
      ['<turn about="unsolved" question="1" hint="yes">\nWhat do the ', "pebbles stand for?"],
      ["<tu", 'rn about="unsolved" quest', 'ion="1" hint="yes"', ">", "\n", "\nWhat do the pebbles stand for?"],
      [..."<turn about=\"unsolved\" question=\"1\" hint=\"yes\">\nWhat do the pebbles stand for?"],
    ]) {
      const got = read(...deltas);
      expect(got.shown).toBe("What do the pebbles stand for?");
      expect(got.text).toBe(got.shown);
      expect(got.turn).toEqual({ about: "unsolved", question: 1, hint: true });
    }
    // A reply without the line is shown whole and counts as no hint.
    expect(read("Count ", "them.")).toEqual({ shown: "Count them.", text: "Count them.", turn: null });
    expect(read("<", "b>bold</b>").shown).toBe("<b>bold</b>");
    expect(read("<tu").shown).toBe("<tu");
    expect(read(`<turn ${"x".repeat(300)}`).turn).toBeNull();
  });
});

describe("the tutor's replies on screen", () => {
  it("renders Markdown and mathematics", () => {
    const html = renderReply("So **twelve** take away three is $12 - 3 = 9$.");
    expect(html).toContain("<strong>twelve</strong>");
    expect(html).toContain('class="katex"');
  });
  it("shows HTML as text, drops images and only links to web addresses", () => {
    const html = renderReply('<img src=x onerror="alert(1)"> <script>alert(2)</script>\n\n![a cat](https://example.com/cat.png) [bad](javascript:alert(3)) [good](https://example.com/)');
    expect(html).not.toMatch(/<img|<script|javascript:/);
    expect(html).toContain("&lt;img");
    expect(html).toContain("a cat");
    expect(html).toContain('<a href="https://example.com/" target="_blank" rel="noopener noreferrer">good</a>');
  });
  it("does not fail on mathematics that is still arriving or malformed", () => {
    expect(() => renderReply("The slope is $\\frac{1}{")).not.toThrow();
    expect(() => renderReply("$$\\badcommand{x}$$")).not.toThrow();
  });
});

describe("the tutor's cost", () => {
  it("prices a reply from its token counts, with cached text far cheaper", () => {
    expect(costMicroUsd("claude-opus-5-5", { input_tokens: 2000, output_tokens: 600 })).toBe(20_000);
    expect(costMicroUsd("claude-opus-5-5", { cache_read_input_tokens: 10_000 })).toBe(2_000);
    expect(costMicroUsd("claude-opus-5-5", { cache_creation_input_tokens: 10_000 })).toBe(80_000);
    expect(costMicroUsd("claude-haiku-5-5", { input_tokens: 2000, output_tokens: 600 })).toBe(500);
    // An unknown model is charged at the dearest rate rather than at nothing.
    expect(costMicroUsd("some-new-model", { input_tokens: 1000 })).toBe(4_000);
  });
  it("always uses medium effort, whatever the environment says", () => {
    expect(tutorModel()).toBe("claude-opus-5-5");
    expect(tutorEffort()).toBe("medium");
    for (const asked of ["low", "high", "xhigh", "max"]) {
      process.env.BEDROCK_TUTOR_EFFORT = asked;
      expect(tutorEffort()).toBe("medium");
    }
    delete process.env.BEDROCK_TUTOR_EFFORT;
  });
});

describe("the tutor's conversation", () => {
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

  it("keeps one thread per lesson, oldest first", async () => {
    await saveTutorMessage(db, userId, "f0.counting", "user", "Why pebbles?");
    await saveTutorMessage(db, userId, "f0.counting", "assistant", "One for each sheep.", 20_000);
    await saveTutorMessage(db, userId, "f0.adding", "user", "A different lesson");
    expect((await tutorHistory(db, userId, "f0.counting")).map((m) => [m.role, m.content])).toEqual([
      ["user", "Why pebbles?"],
      ["assistant", "One for each sheep."],
    ]);
    expect(await tutorHistory(db, userId, "f0.counting", 1)).toHaveLength(1);
  });

  it("reports every answer given to each question, oldest first", async () => {
    const attempt = (questionId: string, correct: boolean, answer: unknown, ms: number) =>
      recordAttempt(db, userId, { conceptId: "f0.counting", questionId, system: "s2", correct, answer, ms }, ["pebbles", "other"]);
    await attempt("pebbles", false, "15", 30_000);
    await attempt("pebbles", false, "8", 45_000);
    await attempt("pebbles", true, "9", 15_000);
    await attempt("other", false, 2, 5_000);
    const history = await attemptHistory(db, userId, "f0.counting");
    expect(history.get("pebbles")!.map((a) => [String(a.answer), a.correct, a.ms])).toEqual([["15", false, 30_000], ["8", false, 45_000], ["9", true, 15_000]]);
    expect(history.get("other")!.map((a) => a.answer)).toEqual([2]);
    expect((await attemptHistory(db, userId, "f0.adding")).size).toBe(0);
  });

  it("keeps the tutor's judgement with each reply, and counts its hints even after the conversation is cleared", async () => {
    await saveTutorMessage(db, userId, "f0.counting", "user", "I am stuck");
    await saveTutorMessage(db, userId, "f0.counting", "assistant", "What do the pebbles stand for?", 0, { about: "unsolved", questionId: "pebbles", hint: true });
    await saveTutorMessage(db, userId, "f0.counting", "assistant", "You have what you need.", 0, { about: "unsolved", questionId: "pebbles", hint: false });
    await saveTutorMessage(db, userId, "f0.counting", "assistant", "Counting is matching.", 0, { about: "lesson", questionId: null, hint: false });
    const history = await tutorHistory(db, userId, "f0.counting");
    expect(history.map((m) => [m.role, m.about, m.questionId, m.hint])).toEqual([
      ["user", null, null, false],
      ["assistant", "unsolved", "pebbles", true],
      ["assistant", "unsolved", "pebbles", false],
      ["assistant", "lesson", null, false],
    ]);
    expect(await tutorHints(db, userId, "f0.counting")).toEqual(new Map([["pebbles", 1]]));
    await clearTutorHistory(db, userId, "f0.counting");
    expect(await tutorHints(db, userId, "f0.counting")).toEqual(new Map([["pebbles", 1]]));
  });

  it("clears one lesson's conversation and leaves the others", async () => {
    await saveTutorMessage(db, userId, "f0.counting", "assistant", "a", 20_000);
    await saveTutorMessage(db, userId, "f0.adding", "assistant", "b", 1_500_000);
    await clearTutorHistory(db, userId, "f0.counting");
    expect(await tutorHistory(db, userId, "f0.counting")).toEqual([]);
    expect(await tutorHistory(db, userId, "f0.adding")).toHaveLength(1);
  });
});

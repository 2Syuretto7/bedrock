import { z } from "zod";

const base = {
  id: z.string().regex(/^[a-z0-9-]+$/),
  /** s1: fast retrieval and pattern recognition. s2: slow reasoning. */
  system: z.enum(["s1", "s2"]),
  /** The time limit of an s1 question in seconds, when the usual one for its type does not suit it. s2 questions are never timed. */
  seconds: z.number().int().min(10).max(900).optional(),
  prompt: z.string().min(1),
  /** Shown only once the question is solved. */
  explanation: z.string().min(1),
  /** Concepts this question exercises. Defaults to the lesson's own concept. */
  concepts: z.array(z.string()).min(1).optional(),
};

export const numericQuestion = z.strictObject({
  ...base,
  type: z.literal("numeric"),
  answer: z.string(),
  tolerance: z.string().optional(),
  unit: z.string().optional(),
});
export const choiceQuestion = z.strictObject({
  ...base,
  type: z.literal("choice"),
  options: z.array(z.string().min(1)).min(3).max(6),
  answer: z.number().int().min(0),
});
export const predictQuestion = z.strictObject({
  ...base,
  type: z.literal("predict"),
  code: z.string().min(1),
  /** Exactly what the code prints. Checked against a real run before merge. */
  output: z.string().min(1),
});
export const orderQuestion = z.strictObject({
  ...base,
  type: z.literal("order"),
  /** Steps in their correct order. The learner sees them shuffled. */
  steps: z.array(z.string().min(1)).min(3).max(8),
});
export const codeQuestion = z.strictObject({
  ...base,
  type: z.literal("code"),
  /** find-bug questions start from broken code; write questions from a stub. */
  mode: z.enum(["write", "find-bug"]),
  starter: z.string(),
  solution: z.string().min(1),
  tests: z.string().min(1),
  /** Plausible wrong submissions. Every one must fail the tests. */
  wrong: z.array(z.string().min(1)).min(1),
});

export const question = z.discriminatedUnion("type", [
  numericQuestion,
  choiceQuestion,
  predictQuestion,
  orderQuestion,
  codeQuestion,
]);
export type Question = z.infer<typeof question>;

export const PARTS = ["recall", "puzzle", "intuition", "derivation", "formal", "drill", "work", "connections"] as const;

export const block = z.union([
  z.strictObject({ text: z.string().min(1) }),
  z.strictObject({ question }),
  z.strictObject({ figure: z.string().regex(/^[a-z-]+$/), props: z.record(z.string(), z.unknown()).optional() }),
]);

export const lesson = z.strictObject({
  concept: z.string(),
  minutes: z.number().int().min(10).max(120),
  /** One sentence: what the learner can do after this lesson. */
  claim: z.string().min(1),
  /** Earlier concepts this lesson explicitly recalls. Must be prerequisites. */
  recalls: z.array(z.string()),
  /** Every other concept the lesson's text and questions rely on. Must be prerequisites. */
  uses: z.array(z.string()),
  /** Later concepts this lesson points forward to. Each must depend on this one. */
  leads: z.array(z.string()),
  /**
   * One entry for every direct prerequisite in another track, keyed by that prerequisite's concept id.
   * A short passage on how that earlier idea connects to this lesson. Learn shows it at the top of
   * this lesson when that prerequisite was the lesson finished just before.
   */
  bridges: z.record(z.string(), z.string().min(1)).optional(),
  starter: z.string().optional(),
  parts: z.strictObject(Object.fromEntries(PARTS.map((part) => [part, z.array(block).min(1)])) as Record<(typeof PARTS)[number], z.ZodArray<typeof block>>),
});
export type Lesson = z.infer<typeof lesson>;

import { createHash } from "node:crypto";
import { z } from "zod";
import { grade, shuffled, type Verdict } from "../lessons/grade";
import { parseRational } from "../lessons/number";
import type { Question } from "../lessons/schema";

/**
 * A review question. It is written afresh for one learner and one review, and
 * is never shown again once answered. A review is one try.
 */
const base = { prompt: z.string().trim().min(1).max(4000), explanation: z.string().trim().min(1).max(4000) };
const number = z.string().refine((text) => parseRational(text) !== null, "Not a number");

export const reviewQuestion = z.discriminatedUnion("type", [
  z.strictObject({ ...base, type: z.literal("numeric"), answer: number, tolerance: number.optional(), unit: z.string().max(40).optional() }),
  z
    .strictObject({ ...base, type: z.literal("choice"), options: z.array(z.string().trim().min(1).max(600)).min(3).max(6), answer: z.number().int().min(0) })
    .refine((q) => q.answer < q.options.length && new Set(q.options).size === q.options.length, "The answer must be one of the options, and no option may repeat"),
  z.strictObject({ ...base, type: z.literal("predict"), code: z.string().min(1).max(4000), output: z.string().min(1).max(2000) }),
]);
export type ReviewQuestion = z.infer<typeof reviewQuestion>;

/** The same question in the shape lesson questions have, so the lesson grader can mark it. */
const asLessonQuestion = (q: ReviewQuestion): Question => ({ ...q, id: "review", system: "s1" }) as Question;

export const gradeReview = (q: ReviewQuestion, answer: unknown): Verdict => grade(asLessonQuestion(q), answer);

/** The order a choice question's options are shown in. Position i on screen is option order[i]. */
export const optionOrder = (q: ReviewQuestion, seed: string) => (q.type === "choice" ? shuffled(q.options.length, seed) : []);

const words = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

/**
 * What a question asks, with spacing, case and punctuation removed. Two
 * questions with the same fingerprint are the same question, however they are laid out.
 */
export function fingerprint(q: { prompt: string; type: string; code?: string; options?: string[] }): string {
  const parts = [words(q.prompt)];
  if (q.type === "predict" && q.code) parts.push(words(q.code));
  if (q.type === "choice" && q.options) parts.push(...q.options.map(words).sort());
  return createHash("sha256").update(parts.join("\n")).digest("hex");
}

/** One line that tells the question writer what has been asked before. */
export function summary(q: { prompt: string; type: string; code?: string; options?: string[] }): string {
  const lines = [q.prompt.trim()];
  if (q.type === "predict" && q.code) lines.push("Code:", q.code.trim());
  if (q.type === "choice" && q.options) lines.push(`Options: ${q.options.join(" | ")}`);
  return lines.join("\n");
}

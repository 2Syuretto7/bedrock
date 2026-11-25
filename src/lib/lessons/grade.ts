import { parseRational, sameNumber, within } from "./number";
import type { Question } from "./schema";

export type Verdict = { correct: boolean; note?: string };

/** Output comparison ignores trailing spaces on lines and trailing blank lines. */
export const normaliseOutput = (text: string) =>
  text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trimEnd();

/**
 * Grades everything except code, which is graded by running its tests.
 */
export function grade(q: Question, answer: unknown): Verdict {
  switch (q.type) {
    case "numeric": {
      const given = typeof answer === "string" ? parseRational(answer) : null;
      if (!given) return { correct: false, note: "Enter a number, such as 12, 0.75 or 3/4." };
      const want = parseRational(q.answer)!;
      const tolerance = q.tolerance ? parseRational(q.tolerance)! : null;
      return { correct: tolerance ? within(given, want, tolerance) : sameNumber(given, want) };
    }
    case "choice":
      return { correct: answer === q.answer };
    case "predict":
      return { correct: typeof answer === "string" && normaliseOutput(answer) === normaliseOutput(q.output) };
    case "order":
      return {
        correct: Array.isArray(answer) && answer.length === q.steps.length && answer.every((step, i) => step === i),
      };
    case "code":
      throw new Error("Code questions are graded by their tests");
  }
}

/** A stable shuffle, so a question's options look the same on every visit and device. */
export function shuffled(length: number, seed: string): number[] {
  let state = 2166136261;
  for (const char of seed) state = Math.imul(state ^ char.charCodeAt(0), 16777619) >>> 0;
  const order = Array.from({ length }, (_, i) => i);
  for (let i = length - 1; i > 0; i--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  // Never present an ordering question already solved.
  if (length > 1 && order.every((value, i) => value === i)) order.reverse();
  return order;
}

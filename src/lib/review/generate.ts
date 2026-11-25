import { z } from "zod";
import type { Graph } from "../graph/load";
import { shuffled } from "../lessons/grade";
import type { Lesson } from "../lessons/schema";
import { lessonText } from "../tutor/prompt";
import { fingerprint, gradeReview, reviewQuestion, type ReviewQuestion } from "./question";

/** How many times a question is written before giving up. A question that fails its check is thrown away, never shown. */
const TRIES = 2;
/** Earlier questions sent to the writer, newest last. Exact repeats are refused whatever this number is. */
const EARLIER_SENT = 40;

const ROLE = `You write and check recall questions for Bedrock, one learner's personal university for the engineering done at frontier AI labs and top technology companies: software, distributed systems and the cloud, data, machine learning in production, hardware and high-performance computing, and security and reliability, on a foundation of mathematics. The curriculum starts from place value and builds upwards one lesson at a time.

Bedrock brings each finished lesson back for review at growing gaps of time. A review is a single timed question, answered in one try with no hints, that the learner has never seen before. Its purpose is to make the learner pull the lesson's idea out of memory and use it. The lesson below is the one being reviewed. The learner finished it some time ago and does not have it open.`;

/** What the model is told about the lesson. It is the same for writing and checking, and for every review of the lesson, so it is cached. */
export function reviewSystem(graph: Graph, lesson: Lesson): string {
  const title = (id: string) => graph.concepts.get(id)?.title ?? id;
  const before = [...new Set([...lesson.recalls, ...lesson.uses])].map(title);
  return [
    ROLE,
    [
      "# The lesson under review",
      `Lesson: ${title(lesson.concept)}`,
      `After it the learner can: ${lesson.claim}`,
      before.length ? `It builds on these earlier lessons: ${before.join("; ")}` : "It is the first lesson. Assume nothing beyond everyday experience.",
    ].join("\n"),
    `# The lesson as the learner saw it, with its own questions and their answers\n${lessonText(graph, lesson)}`,
  ].join("\n\n");
}

const WRITE = `Write one new recall question on this lesson.

What it must test:
- The idea in "After it the learner can", or a key idea the lesson rests on. Not a detail of the lesson's stories or examples.
- It is timed: the learner has 30 seconds for a choice question and 60 seconds for a numeric or predict question, counted from the moment the question appears. It must be answerable from memory in well under that, reading included, without a calculator. Keep the prompt short.
- It uses only ideas taught in this lesson and the earlier lessons it builds on. For code, only Python this lesson has shown.

It must be new:
- Different in substance from every question in the lesson and from every earlier review question listed below: a different situation, different numbers and, where the lesson allows it, a different angle on the idea.
- Never reuse a story, a set of numbers or a piece of code from the lesson or from an earlier review question.

Choose the type that suits the idea:
- "numeric": the answer is one number. Put it in "answer" as an integer, a decimal or a fraction such as 3/4, with no unit and no words. Fill "tolerance" only when the answer has to be rounded. Put a unit in "unit" only if the answer has one.
- "choice": three to five options in "options", exactly one of them correct. Each wrong option must be the result of a mistake a learner would really make. Put the exact text of the correct option in "answer".
- "predict": only for a lesson that teaches programming. Put a short Python program in "code", at most twelve lines, that always prints the same thing. Put exactly what it prints in "answer". The prompt asks what the program prints.

How to write it:
- "prompt" is the question as the learner reads it. It never gives the answer away.
- "explanation" is shown after the learner answers: two to four sentences that derive the answer from the lesson's idea.
- Use Markdown, with mathematics in LaTeX between dollar signs. No HTML and no images.
- Write in Indian English spelling. Never use emojis.
- Leave a field that the type does not use as an empty string or an empty list.`;

const CHECK = `Below is a recall question written for this lesson. Check it by solving it yourself from scratch, as carefully as the learner would.

Set "sound" to false, and say why in "problem", if any of these is true:
- The question is unclear, or more than one answer could be defended.
- For a choice question, no option is correct or more than one is.
- It needs an idea that is not in this lesson or the earlier lessons it builds on.
- The prompt gives the answer away.
- It is the same in substance as one of the lesson's own questions.
Otherwise set "sound" to true and leave "problem" empty.

Put your own answer in "answer": for a numeric question the number alone; for a choice question the exact text of the option you choose; for a predict question exactly what the program prints.`;

const drafted = z.object({
  type: z.enum(["numeric", "choice", "predict"]),
  prompt: z.string(),
  code: z.string(),
  options: z.array(z.string()),
  answer: z.string(),
  tolerance: z.string(),
  unit: z.string(),
  explanation: z.string(),
});
const checked = z.object({ sound: z.boolean(), problem: z.string(), answer: z.string() });

/** Turns what the writer sent into a review question, or null if it does not hold together. */
export function fromDraft(draft: z.infer<typeof drafted>): ReviewQuestion | null {
  const base = { prompt: draft.prompt, explanation: draft.explanation };
  const candidate =
    draft.type === "numeric"
      ? { ...base, type: "numeric", answer: draft.answer.trim(), tolerance: draft.tolerance.trim() || undefined, unit: draft.unit.trim() || undefined }
      : draft.type === "choice"
        ? { ...base, type: "choice", options: draft.options.map((o) => o.trim()), answer: draft.options.findIndex((o) => o.trim() === draft.answer.trim()) }
        : { ...base, type: "predict", code: draft.code, output: draft.answer };
  const parsed = reviewQuestion.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

/** The question as the checker sees it: what the learner sees, and nothing more. Options are shuffled so position says nothing. */
export function forChecker(q: ReviewQuestion): string {
  const lines = [`Type: ${q.type}`, "Prompt:", q.prompt];
  if (q.type === "choice") lines.push("Options:", ...shuffled(q.options.length, q.prompt).map((i) => `- ${q.options[i]}`));
  if (q.type === "predict") lines.push("Code:", "```python", q.code, "```");
  if (q.type === "numeric" && q.unit) lines.push(`Unit of the answer: ${q.unit}`);
  return lines.join("\n");
}

/** Whether the checker, working alone, reached the answer the writer gave. */
export function agrees(q: ReviewQuestion, check: z.infer<typeof checked>): boolean {
  if (!check.sound) return false;
  const given = q.type === "choice" ? q.options.findIndex((o) => o === check.answer.trim()) : check.answer;
  return gradeReview(q, given).correct;
}

export type Ask = <T>(system: string, message: string, shape: z.ZodType<T>) => Promise<{ value: T | null; costMicroUsd: number }>;

export type Written = { question: ReviewQuestion; fingerprint: string; costMicroUsd: number };

/**
 * Writes a question the learner has never seen, and has it checked.
 *
 * `earlier` are summaries of the review questions already written for this
 * lesson, oldest first, and `taken` the fingerprints of those and of the
 * lesson's own questions. A question is only returned if it is not one of
 * those, and if a second, independent pass that is not told the answer solves
 * it and reaches the same answer. Returns null if no such question was written.
 */
export async function writeReviewQuestion(
  input: { graph: Graph; lesson: Lesson; earlier: string[]; taken: Set<string> },
  ask: Ask,
): Promise<Written | { question: null; costMicroUsd: number }> {
  const system = reviewSystem(input.graph, input.lesson);
  const earlier = input.earlier.slice(-EARLIER_SENT);
  const asked = earlier.length
    ? `# Earlier review questions on this lesson\n${earlier.map((text, i) => `${i + 1}.\n${text}`).join("\n\n")}`
    : "# Earlier review questions on this lesson\nNone yet.";
  let cost = 0;
  for (let attempt = 0; attempt < TRIES; attempt++) {
    const draft = await ask(system, `${WRITE}\n\n${asked}`, drafted);
    cost += draft.costMicroUsd;
    const question = draft.value && fromDraft(draft.value);
    if (!question) continue;
    const print = fingerprint(question);
    if (input.taken.has(print)) continue;
    const check = await ask(system, `${CHECK}\n\n# The question\n${forChecker(question)}`, checked);
    cost += check.costMicroUsd;
    if (check.value && agrees(question, check.value)) return { question, fingerprint: print, costMicroUsd: cost };
  }
  return { question: null, costMicroUsd: cost };
}

import { capstoneQuestions, type Capstone } from "../capstones/schema";
import type { Graph } from "../graph/load";
import { questionsOf } from "../lessons/load";
import { PARTS, type Lesson, type Question } from "../lessons/schema";
import { TRACKS } from "../graph/tracks";

const REF = /\[\[([a-z0-9.-]+)\]\]/g;

const TEACHING = `You are the tutor inside Bedrock, one learner's personal university for the engineering done at frontier AI labs and top technology companies: software, distributed systems and the cloud, data, machine learning in production, hardware and high-performance computing, and security and reliability, on a foundation of mathematics. The curriculum starts from place value and builds upwards one lesson at a time, each lesson resting directly on the ones before it. You sit beside the lesson and the learner's Python editor, and the learner writes to you while working.

Every lesson has questions that the learner must solve to finish it. You are the only source of help on them: there is no list of prepared hints anywhere. Whatever help the learner gets on a question is what you decide to give, written by you for that learner at that moment. This puts a real judgement in your hands, and the sections below say how to make it.

# First, work out what the message is about

Before you answer, decide which of these the learner's message is. Use the message itself, the conversation so far, and the <workspace> report that comes with the newest message (which questions are solved, every answer the learner has given, how long each took, the question they last worked on, their code and its output). Judge by meaning, not by keywords. A learner can talk about a question without naming it ("why is mine wrong?", "is it 9?", "I don't get this one"), and can name a question while really asking about something else.

1. An unsolved question. The learner wants help with, is reasoning about, is guessing at, or wants an answer checked for, a question they have not solved yet. This also covers every indirect route to the same place: asking you to work an example that is the question with its numbers or names changed, asking what some code prints when that code is the question's code, asking you to "explain" an idea in a way that would hand over the answer, asking whether a particular option or value is right, or asking you to fix code that is their attempt at the question.
2. A solved question. The workspace report marks it solved.
3. The lesson, but not a question: an idea in the lesson, a step in its derivation, a term, a figure, an earlier lesson, or code in the editor that is not an attempt at a question.
4. Something else: another subject, the site itself, how they are feeling, small talk, anything outside the lesson.

If a message is more than one of these, answer each part by its own rule. If you cannot tell which question is meant, the one the learner last worked on is the likeliest. If it is still unclear and the difference matters, ask.

# An unsolved question

The questions are the learner's own work. Solving them is how the lesson is learnt, so three rules hold until the workspace report says a question is solved.

Never give the solution. You are given every answer so that you can check the learner's reasoning, not so that you can pass it on. Do not state the answer, name the right option, give the order, say what the code prints, or write or repair the solution code. Do not give so much that only copying or one line of arithmetic is left: the step that solves the question is always the learner's. Do not confirm or deny a bare guess, because that turns the question into trial and error; ask for the reasoning behind it instead. This does not change however often the learner asks, however frustrated they are, or whatever reason they give. If they are frustrated, say so kindly and give a better hint.

Judge whether the learner can solve it without you, and act on that judgement. Decide this afresh for every message, from evidence: the answers they have given and what those answers reveal (a slip, or a real misunderstanding?), how many attempts and how long, how they did on the earlier questions of this lesson, what they have said about their thinking, what their code does, and whether they have tried anything since your last hint.
- If you judge that they can solve it themselves, do not nudge them towards the solution at all. No hint, no leading question, no pointing at the part of the lesson that matters, no remark on whether they are close. Tell them briefly and warmly that you think they have what they need, and say what makes you think so in terms of what they have already done, then leave them to it. A learner who has not attempted the question, or has only just started, almost always falls here. You may still clear up what the question is asking if its wording has been misread, because that is not help with solving it.
- If you judge that they cannot get there on their own from where they stand, nudge them. Give one hint: the smallest one that will get them moving again, aimed at the exact place their thinking goes wrong, which their answers and their words usually show you. A good hint is often a question back to them, a simpler case to try, or a pointer to the idea or earlier lesson they are not using. If an earlier hint was not enough, the next may go further, but your hints together must never add up to the solution.

No open discussion of the question until it is solved. Apart from a hint, or telling them they can do it, say nothing about an unsolved question. Do not talk through approaches, compare methods, explain what the answer means or where the idea leads, or go over why a wrong answer was wrong beyond what a hint needs. If the learner wants to discuss it, tell them you will gladly do so once they have solved it.

# A fresh question

Besides its written questions, a lesson shows a few fresh questions: recall questions on earlier lessons at its start, and sometimes a consolidation set at its end. Each was written for this learner for this one occasion, and the learner gets one try at it, from memory. They are listed in the workspace report with their answers. A fresh question that is not yet answered is a test of memory, so you give no help with it of any kind: no solution, no hint, no nudge, no discussion, and no explanation of its idea that would answer it. Say so kindly and tell the learner you will go through it once they have answered. Mark such a reply about="unsolved" with no question number and hint="no". Once a fresh question is answered, right or wrong, discuss it openly, as you would a solved question.

# A solved question

Open discussion. Say anything that helps: the answer and why it is right, why their earlier answers went wrong, other ways to reach it, harder versions, where the idea leads. A solved question never unlocks an unsolved one, so do not let talk about it settle a question that is still open.

# The lesson, but not a question

Teach, fully, in the manner described below. One caution while questions are still unsolved: do not let an explanation solve one of them by the back door. Use different numbers, different code and a different example from those of the unsolved questions.

# Something else

Answer as a thoughtful person would: directly, and at the length the message deserves. You do not need to drag the conversation back to the lesson. If the subject is one the curriculum reaches later, say so.

# How you teach, in the manner of Richard Feynman

- Start from first principles and from something the learner can picture or compute. Intuition comes first, and the formal statement comes after it.
- Derive, do not declare. When a result matters, show where it comes from in small steps that each follow from the last, rather than stating it and asking for trust.
- Use one concrete example with actual numbers before any general statement. Prefer a fresh example to repeating the lesson's own.
- Say things plainly. If a simpler word will do, use it. Name a piece of jargon only after the idea behind it is clear.
- Find the exact point where the learner's understanding stops. If the message shows a specific confusion, address that confusion, not the whole topic.
- Be honest about what is hard, and say so when something is a convention rather than a truth.
- When the learner shares code, read what it actually does, line by line. Use only Python the learner has met in finished lessons or this one.

# Staying close to what the learner knows

- The learner has finished only the lessons listed under "Finished". Build every explanation and every hint from those ideas and from the lesson in progress. Do not lean on anything else, however standard it is.
- If a good answer needs an idea from a lesson that is still ahead, say that it comes later and name the lesson if it is listed. Then give the most honest explanation you can using only what the learner already has.
- When an earlier lesson is the real source of a difficulty, point back to it by its title.

# Form

- Begin every reply with one line, on its own, in exactly this shape. The learner never sees it; Bedrock reads it and removes it.
  <turn about="unsolved" question="2" hint="yes">
  about is "unsolved", "solved", "lesson" or "other", as judged above (for a message that is several, the one your reply mostly serves). question is the number of the question concerned, and is left out when about is "lesson" or "other". hint is "yes" only when the reply gives any help towards solving an unsolved question, however small, and "no" otherwise, including when you tell the learner they can do it alone. Be truthful here: these lines are the record of how much help each question took, and the learner's mastery is worked out from them.
- After that line, keep replies short: usually under 150 words, longer only when a derivation or an open discussion needs the room. A hint is a sentence or two. One idea at a time.
- Write in Indian English spelling (for example "colour", "learnt", "maths"). Never use emojis.
- Use Markdown. Write mathematics in LaTeX between dollar signs: $x^2$ inline and $$...$$ on its own line for a displayed step. Put code in fenced blocks marked python. Do not use images or HTML.
- Refer to lessons by their titles, never by an id. Refer to questions by their numbers. Never mention the workspace report or the opening line to the learner.`;

const title = (graph: Graph, id: string) => graph.concepts.get(id)?.title ?? id;
const plain = (graph: Graph, text: string) => text.replace(REF, (_, id: string) => title(graph, id));

function questionText(graph: Graph, q: Question, number: number): string {
  const lines = [`Question ${number} (id ${q.id}, ${q.type}):`, plain(graph, q.prompt)];
  if (q.type === "numeric") lines.push(`Answer: ${q.answer}${q.unit ? ` ${q.unit}` : ""}`);
  if (q.type === "choice") lines.push(`Options: ${q.options.map((o) => plain(graph, o)).join(" | ")}`, `Answer: ${plain(graph, q.options[q.answer])}`);
  if (q.type === "predict") lines.push("Code:", q.code, `It prints: ${q.output}`);
  if (q.type === "order") lines.push("Correct order:", ...q.steps.map((step, i) => `${i + 1}. ${plain(graph, step)}`));
  if (q.type === "code") lines.push(`Kind: ${q.mode === "find-bug" ? "find and fix the bug" : "write the program"}`, "Starting code:", q.starter, "Reference solution:", q.solution, "Checks:", q.tests);
  lines.push(`Explanation shown once solved: ${plain(graph, q.explanation)}`);
  return lines.join("\n");
}

/** A lesson as plain text, with its questions and their answers. */
export function lessonText(graph: Graph, lesson: Lesson): string {
  const numbers = new Map(questionsOf(lesson).map((q, i) => [q.id, i + 1]));
  const out: string[] = [];
  for (const part of PARTS) {
    out.push(`## ${part}`);
    for (const block of lesson.parts[part]) {
      if ("text" in block) out.push(plain(graph, block.text));
      else if ("figure" in block) out.push(`(An interactive figure is shown here: ${block.figure.replace(/-/g, " ")}.)`);
      else out.push(questionText(graph, block.question, numbers.get(block.question.id)!));
    }
  }
  return out.join("\n\n");
}

function capstoneText(graph: Graph, capstone: Capstone): string {
  const numbers = new Map(capstoneQuestions(capstone).map((q, i) => [q.id, i + 1]));
  const out = ["## The project", plain(graph, capstone.brief)];
  capstone.stages.forEach((stage, s) => {
    out.push(`## Stage ${s + 1} of ${capstone.stages.length}: ${plain(graph, stage.title)}`);
    for (const block of stage.blocks) {
      if ("text" in block) out.push(plain(graph, block.text));
      else if ("figure" in block) out.push(`(An interactive figure is shown here: ${block.figure.replace(/-/g, " ")}.)`);
      else out.push(questionText(graph, block.question, numbers.get(block.question.id)!));
    }
  });
  out.push("## What you built (the learner sees this only once every stage is solved)", plain(graph, capstone.review));
  return out.join("\n\n");
}

/** Finished lessons grouped by cluster, in the order of the curriculum. */
function finishedText(graph: Graph, completed: string[]): string {
  const done = new Set(completed);
  const lines: string[] = [];
  for (const cluster of graph.clusters.values()) {
    const titles = cluster.concepts.filter((id) => done.has(id)).map((id) => title(graph, id));
    if (titles.length) lines.push(`- ${TRACKS[cluster.track]}, ${cluster.title}: ${titles.join("; ")}`);
  }
  return lines.length ? lines.join("\n") : "None yet. This is the learner's very first lesson, so assume nothing beyond everyday experience.";
}

export type TutorPosition = {
  graph: Graph;
  /** Completed concepts, oldest first. */
  completed: string[];
  /** The lesson in progress, or null when every written lesson is finished. */
  lesson: Lesson | null;
  /** The lesson Learn gives after this one. */
  next: string | null;
  /** The mini-capstone in progress, when Learn has given one instead of a lesson. */
  capstone?: Capstone | null;
};

/**
 * Everything the tutor is told before the conversation. It depends only on the lesson and on
 * which lessons are finished, so it is identical for every question asked during a lesson
 * and can be cached. Anything that changes from question to question goes in `workspaceNote`.
 */
export function systemPrompt({ graph, completed, lesson, next, capstone }: TutorPosition): string {
  const sections = [TEACHING, `# Finished\n${finishedText(graph, completed)}`];
  if (capstone) {
    const cluster = graph.clusters.get(capstone.cluster);
    sections.push(
      [
        "# In progress",
        `Mini-capstone: ${capstone.title}${cluster ? ` (${TRACKS[cluster.track]}, ${cluster.title})` : ""}`,
        `By the end the learner will have: ${capstone.claim}`,
        "A mini-capstone closes a cluster the learner has just finished. It teaches nothing new: it is one small project, built in stages, that needs several of the cluster's lessons at once. Putting those lessons together is the whole exercise, so the joining up is the learner's to do. Treat its questions exactly as you treat a lesson's questions. When you judge that the learner needs a hint, the best one is usually the name of the finished lesson that holds the idea they need, so that they carry it across themselves, rather than showing how the pieces fit.",
        next ? `Comes after it: ${title(graph, next)}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      `# The mini-capstone as the learner sees it\n${capstoneText(graph, capstone)}`,
    );
  } else if (lesson) {
    const concept = graph.concepts.get(lesson.concept);
    const cluster = concept && graph.clusters.get(concept.cluster);
    const recent = completed.at(-1);
    const later = lesson.leads.filter((id) => id !== next);
    sections.push(
      [
        "# In progress",
        `Lesson: ${title(graph, lesson.concept)}${cluster ? ` (${TRACKS[cluster.track]}, ${cluster.title})` : ""}`,
        `After it the learner can: ${lesson.claim}`,
        recent ? `Finished just before it: ${title(graph, recent)}` : null,
        lesson.recalls.length ? `It builds on: ${lesson.recalls.map((id) => title(graph, id)).join("; ")}` : null,
        next ? `Comes next: ${title(graph, next)}` : null,
        later.length ? `Comes later: ${later.map((id) => title(graph, id)).join("; ")}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      `# The lesson as the learner sees it\n${lessonText(graph, lesson)}`,
    );
  } else {
    sections.push(
      "# In progress\nThe learner has finished every lesson written so far and is using the scratch editor while the next batch is written. Help with revision of finished lessons and with whatever they try in the editor.",
    );
  }
  return sections.join("\n\n");
}

export type WorkspaceState = {
  /** The code question open in the editor. */
  questionId?: string | null;
  /** The question the learner last touched, typed into or opened. */
  attendingId?: string | null;
  code?: string;
  output?: string;
  solved?: string[];
  /** Every answer given so far, oldest first, by question id. */
  attempts?: Map<string, { correct: boolean; answer: unknown; ms: number | null; at: Date }[]>;
  /** Hints the tutor has given so far, by question id. */
  hints?: Map<string, number>;
  /** The fresh questions shown in this lesson: its recall questions and, after a weak finish, its consolidation set. */
  fresh?: FreshQuestion[];
  now?: Date;
};

export type FreshQuestion = {
  purpose: "recall" | "consolidation";
  /** The title of the lesson whose idea it asks about. */
  idea: string;
  question:
    | { type: "numeric"; prompt: string; answer: string; unit?: string }
    | { type: "choice"; prompt: string; options: string[]; answer: number }
    | { type: "predict"; prompt: string; code: string; output: string };
  answered: boolean;
  correct: boolean | null;
};

function freshLines(fresh: FreshQuestion[]): string[] {
  const lines: string[] = [];
  for (const purpose of ["recall", "consolidation"] as const) {
    fresh
      .filter((row) => row.purpose === purpose)
      .forEach((row, i) => {
        const q = row.question;
        const state = row.answered ? `answered, ${row.correct ? "right" : "wrong"}: open to discussion` : "not answered yet: give no help with it";
        lines.push(`Fresh ${purpose} question ${i + 1}, on ${row.idea} (${state}):`, `  ${q.prompt.trim().replace(/\n/g, "\n  ")}`);
        if (q.type === "predict") lines.push("  Code:", ...q.code.trim().split("\n").map((line) => `    ${line}`), `  It prints: ${q.output}`);
        if (q.type === "choice") lines.push(`  Options: ${q.options.join(" | ")}`, `  Answer: ${q.options[q.answer]}`);
        if (q.type === "numeric") lines.push(`  Answer: ${q.answer}${q.unit ? ` ${q.unit}` : ""}`);
      });
  }
  return lines;
}

const duration = (ms: number) => (ms < 60_000 ? `${Math.max(1, Math.round(ms / 1000))} s` : `${Math.round(ms / 60_000)} min`);

const cut = (text: string, max: number) => (text.length > max ? `${text.slice(0, max)}\n(cut short here)` : text);

/** How many of a question's answers are spelt out for the tutor. Earlier ones are only counted. */
const ANSWERS_SHOWN = 6;

/** An answer as the learner gave it, in words the tutor can set against the lesson. */
function answerText(q: Question, answer: unknown): string {
  if (q.type === "code") return "code, which failed the checks";
  if (q.type === "choice") return typeof answer === "number" && q.options[answer] ? JSON.stringify(q.options[answer]) : "no option";
  // Steps are numbered as in the correct order, so 1, 2, 3 would be right.
  if (q.type === "order") return Array.isArray(answer) ? `the steps in the order ${answer.map((i) => Number(i) + 1).join(", ")}` : "no order";
  return JSON.stringify(cut(String(answer ?? ""), 300));
}

/** What is on the learner's screen right now, and what they have done so far. Sent with the newest message only. */
export function workspaceNote(unit: Lesson | Capstone | null, state: WorkspaceState): string {
  const lines: string[] = [];
  if (unit) {
    const questions = "parts" in unit ? questionsOf(unit) : capstoneQuestions(unit);
    const solved = new Set(state.solved ?? []);
    const now = state.now ?? new Date();
    const number = (id: string) => questions.findIndex((q) => q.id === id) + 1;
    const status = (id: string) => (solved.has(id) ? "solved" : "not solved yet");
    const done = questions.filter((q) => solved.has(q.id)).map((q) => number(q.id));
    lines.push(done.length ? `Questions solved so far: ${done.join(", ")} of ${questions.length}.` : `No questions solved yet, of ${questions.length}.`);
    for (const q of questions) {
      const tries = state.attempts?.get(q.id) ?? [];
      const hints = state.hints?.get(q.id) ?? 0;
      if (!tries.length && !hints) {
        if (!solved.has(q.id)) lines.push(`Question ${number(q.id)}: not solved yet; not attempted.`);
        continue;
      }
      const parts = [status(q.id)];
      if (tries.length) {
        const wrong = tries.filter((t) => !t.correct).length;
        const ms = tries.reduce((sum, t) => sum + (t.ms ?? 0), 0);
        parts.push(`${tries.length} ${tries.length === 1 ? "attempt" : "attempts"}, ${wrong} wrong`);
        if (ms > 0) parts.push(`${duration(ms)} spent`);
        parts.push(`last attempt ${duration(Math.max(0, now.getTime() - tries.at(-1)!.at.getTime()))} ago`);
      } else parts.push("not attempted");
      parts.push(hints ? `${hints} ${hints === 1 ? "hint" : "hints"} from you so far` : "no hints from you so far");
      lines.push(`Question ${number(q.id)}: ${parts.join("; ")}.`);
      const shown = tries.slice(-ANSWERS_SHOWN);
      if (shown.length) {
        const given = shown.map((t) => `${answerText(q, t.answer)} (${t.correct ? "right" : "wrong"})`).join("; ");
        lines.push(`  ${tries.length > shown.length ? `Its last ${shown.length} answers` : "Its answers"}, oldest first: ${given}.`);
      }
    }
    const attending = state.attendingId ? number(state.attendingId) : 0;
    const firstOpen = questions.find((q) => !solved.has(q.id));
    if (attending > 0) lines.push(`The question the learner last worked on is question ${attending} (${status(state.attendingId!)}).`);
    else if (firstOpen) lines.push(`The learner has not touched a question since opening this page. The first one not solved is question ${number(firstOpen.id)}.`);
    const open = state.questionId ? number(state.questionId) : 0;
    if (open > 0) lines.push(`The editor holds the learner's attempt at question ${open} (${status(state.questionId!)}).`);
  }
  if (state.fresh?.length) lines.push(...freshLines(state.fresh));
  if (state.code?.trim()) lines.push("Code in the editor:", "```python", cut(state.code, 6000), "```");
  if (state.output?.trim()) lines.push("Output of the last run:", "```", cut(state.output, 2000), "```");
  return lines.length ? `<workspace>\n${lines.join("\n")}\n</workspace>` : "";
}

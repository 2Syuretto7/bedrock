import { ancestors, type Graph } from "../graph/load";
import { teachingPath } from "../learning/next";
import { normaliseOutput } from "./grade";
import { checkProgram, featureProgram } from "./harness";
import type { LessonFile } from "./load";
import type { RunPython } from "./node-python";
import { parseRational } from "./number";
import { conceptRefs, renderBlock, renderInline } from "./render";
import { lesson as lessonSchema, PARTS, type Lesson, type Question } from "./schema";

export type Issue = { file: string; where: string; message: string };

export type ValidateOptions = {
  graph: Graph;
  files: LessonFile[];
  /** Which concept first teaches which Python feature. */
  features: Map<string, string[]>;
  figures: Set<string>;
  run: RunPython;
  /** Lessons are meant to be long and dense. The shortest prose a lesson may have. */
  minWords: number;
  /** While writing: check the content of these lesson files only. The graph rules still cover every lesson. */
  only?: (file: string) => boolean;
};

export const words = (text: string) => text.split(/\s+/).filter(Boolean).length;

/** A bridge is a short passage, not a second recall section. The most words one may have. */
export const BRIDGE_MAX_WORDS = 120;

/** The direct prerequisites of a concept that are in another track. Each needs a bridge in that concept's lesson. */
export const crossTrackPrerequisites = (graph: Graph, concept: string): string[] => {
  const { track, requires } = graph.concepts.get(concept)!;
  return requires.filter((id) => graph.concepts.get(id)!.track !== track);
};

/**
 * Everything a lesson must satisfy before the learner can see it.
 *
 * Correctness: answers parse, predicted outputs are real, reference solutions
 * pass their tests, and wrong solutions and starters fail them.
 *
 * Continuity: Learn can walk the written lessons as one chain in which each
 * lesson builds directly on the one before it, and each lesson recalls every
 * direct prerequisite. Where a direct prerequisite is in another track, the
 * lesson also carries a bridge for it: a short passage on how that idea
 * connects to this one, which Learn shows when the learner arrives from there.
 *
 * Closeness: a lesson may only lean on what the learner has learnt (its
 * prerequisites), what it is teaching now (its own concept) and what comes
 * next (concepts that depend on it). That holds for concepts named in the
 * text, for the concepts each question exercises, and for every Python
 * feature in any code the learner reads or is asked to write.
 */
export async function validateLessons(options: ValidateOptions): Promise<Issue[]> {
  const { graph, files, features, figures, run, minWords } = options;
  const issues: Issue[] = [];
  const lessons = new Map<string, { file: string; lesson: Lesson }>();

  for (const { file, raw } of files) {
    const parsed = lessonSchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues.slice(0, 5)) {
        issues.push({ file, where: issue.path.join(".") || "lesson", message: issue.message });
      }
      continue;
    }
    const lesson = parsed.data;
    if (!graph.concepts.has(lesson.concept)) {
      issues.push({ file, where: "concept", message: `Unknown concept ${lesson.concept}` });
    } else if (lessons.has(lesson.concept)) {
      issues.push({ file, where: "concept", message: `${lesson.concept} already has a lesson in ${lessons.get(lesson.concept)!.file}` });
    } else {
      lessons.set(lesson.concept, { file, lesson });
    }
  }

  // Focused batches: a cluster is written whole or not at all.
  for (const cluster of graph.clusters.values()) {
    const written = cluster.concepts.filter((id) => lessons.has(id));
    if (written.length > 0 && written.length < cluster.concepts.length) {
      const missing = cluster.concepts.filter((id) => !lessons.has(id));
      issues.push({ file: `cluster ${cluster.id}`, where: "batch", message: `Half-written cluster. Missing lessons: ${missing.join(", ")}` });
    }
  }

  // One unbroken chain: every lesson builds directly on the one Learn offers before it.
  const { path: taught, broken } = teachingPath(graph, new Set(lessons.keys()));
  if (broken) issues.push({ file: "graph", where: "chain", message: broken });

  const dependants = new Map<string, Set<string>>();
  for (const id of graph.concepts.keys()) {
    for (const ancestor of ancestors(graph, id)) {
      if (!dependants.has(ancestor)) dependants.set(ancestor, new Set());
      dependants.get(ancestor)!.add(id);
    }
  }

  for (const [concept, { file, lesson }] of lessons) {
    if (options.only && !options.only(file)) continue;
    const add = (where: string, message: string) => issues.push({ file, where, message });
    const past = ancestors(graph, concept);
    const future = dependants.get(concept) ?? new Set<string>();

    for (const id of [...lesson.recalls, ...lesson.uses]) {
      if (!past.has(id)) add("recalls/uses", `${id} is not a prerequisite of ${concept}, so the learner has not met it yet`);
    }
    // Whichever lesson came just before this one, it is a direct prerequisite, so it is recalled here.
    for (const id of graph.concepts.get(concept)!.requires) {
      if (!lesson.recalls.includes(id)) add("recalls", `Must recall its direct prerequisite ${id}`);
    }
    // Arriving from another track is a change of subject, so the lesson says how that idea connects to this one.
    const crossing = crossTrackPrerequisites(graph, concept);
    for (const id of crossing) {
      if (!lesson.bridges?.[id]) add("bridges", `Must have a bridges entry for ${id}, its direct prerequisite in another track`);
    }
    for (const id of Object.keys(lesson.bridges ?? {})) {
      if (!crossing.includes(id)) add("bridges", `${id} is not a direct prerequisite of ${concept} in another track, so its bridge would never be shown`);
    }
    for (const id of lesson.leads) {
      if (!future.has(id)) add("leads", `${id} does not depend on ${concept}, so it is not what comes next`);
    }
    if (future.size > 0 && lesson.leads.length === 0) add("leads", "Name at least one later concept this lesson prepares for");
    // What a lesson says comes next is the lesson Learn gives next.
    const following = taught.includes(concept) ? taught[taught.indexOf(concept) + 1] : undefined;
    if (following) {
      if (!lesson.leads.includes(following)) add("leads", `Learn gives ${following} after this lesson, so leads must list it`);
      const closing = lesson.parts.connections.flatMap((block) => ("text" in block ? conceptRefs(block.text) : []));
      if (!closing.includes(following)) add("connections", `Learn gives ${following} after this lesson, so the connections must point to [[${following}]]`);
    }

    const near = new Set([concept, ...lesson.recalls, ...lesson.uses]);
    const mentionable = new Set([...near, ...lesson.leads]);
    const allowedPython = new Set([concept, ...past].flatMap((id) => features.get(id) ?? []));

    const shown = Object.values(lesson.parts)
      .flat()
      .flatMap((block) => ("text" in block ? pythonExamples(block.text) : []))
      .join("\n");
    const { checkCode, checkText } = textChecks({ add, mentionable, allowedPython, shown, run });

    const seen = new Set<string>();
    const questions: Question[] = [];
    let prose = 0;
    if (lesson.starter) await checkCode("starter", lesson.starter);
    for (const [id, text] of Object.entries(lesson.bridges ?? {})) {
      const where = `bridges.${id}`;
      if (words(text) > BRIDGE_MAX_WORDS) add(where, `A bridge is short: ${words(text)} words, and the most is ${BRIDGE_MAX_WORDS}`);
      await checkText(where, text);
    }

    for (const part of PARTS) {
      for (const [index, block] of lesson.parts[part].entries()) {
        const where = `${part}[${index}]`;
        if ("text" in block) {
          prose += words(block.text);
          await checkText(where, block.text);
        } else if ("figure" in block) {
          if (!figures.has(block.figure)) add(where, `No figure named ${block.figure}`);
        } else {
          const q = block.question;
          const at = `${where} ${q.id}`;
          questions.push(q);
          if (seen.has(q.id)) add(at, "Duplicate question id");
          seen.add(q.id);
          if (part === "recall") add(at, "The Recall part holds no written questions: its three questions are written afresh for each learner");
          if (q.seconds !== undefined && q.system !== "s1") add(at, "Only fast (s1) questions are timed, so only they can set seconds");
          if (part === "drill" && q.system !== "s1") add(at, "Drill questions are fast retrieval (s1)");
          for (const id of q.concepts ?? []) {
            if (!near.has(id)) add(at, `Exercises ${id}, which is not this concept or a listed prerequisite`);
          }
          await checkText(at, q.prompt);
          await checkText(at, q.explanation);
          await checkQuestion(q, at, add, run, checkCode, checkText);
        }
      }
    }

    if (prose < minWords) add("lesson", `Only ${prose} words of teaching; the minimum is ${minWords}`);
    if (!questions.some((q) => q.system === "s1")) add("lesson", "No fast (s1) question");
    if (!questions.some((q) => q.system === "s2")) add("lesson", "No slow (s2) question");
    if (allowedPython.size > 0) {
      const reading = questions.filter((q) => q.type === "predict" || (q.type === "code" && q.mode === "find-bug")).length;
      const writing = questions.filter((q) => q.type === "code" && q.mode === "write").length;
      if (reading < 2) add("lesson", `Needs at least two code-reading questions; has ${reading}`);
      if (writing < 2) add("lesson", `Needs at least two code-writing questions; has ${writing}`);
    }
  }
  return issues;
}

export type Checks = {
  checkCode: (where: string, code: string, context?: string) => Promise<boolean>;
  checkText: (where: string, text: string, inline?: boolean) => Promise<void>;
};

/**
 * The checks on a passage of text and on a piece of code, shared by lessons and mini-capstones.
 * `mentionable` are the concepts the text may name, `allowedPython` the features its code may use,
 * and `shown` the code of every example in the unit, whose definitions later examples may rely on.
 */
export function textChecks({
  add,
  mentionable,
  allowedPython,
  shown,
  run,
  stray = "which is not this concept, a listed prerequisite or a listed next concept",
}: {
  add: (where: string, message: string) => void;
  mentionable: Set<string>;
  allowedPython: Set<string>;
  shown: string;
  run: RunPython;
  /** How the complaint about a concept that may not be named ends. */
  stray?: string;
}): Checks {
  const checkCode = async (where: string, code: string, context = "") => {
    const result = await run(featureProgram(code, context));
    const listed = result.out.trim();
    if (result.error || listed === "syntax-error") return false;
    const beyond = (JSON.parse(listed) as string[]).filter((feature) => !allowedPython.has(feature));
    if (beyond.length > 0) add(where, `Uses Python the learner has not been taught yet: ${beyond.join(", ")}`);
    return true;
  };
  const checkText = async (where: string, text: string, inline = false) => {
    for (const id of conceptRefs(text)) {
      if (!mentionable.has(id)) add(where, `Mentions [[${id}]], ${stray}`);
    }
    if (/in your own words/i.test(text)) add(where, "Explain-it-back prompts are not allowed");
    // A bar inside mathematics would be read as the edge of a table cell.
    const barInMaths = (row: string) =>
      /^\s*\|/.test(row) &&
      row
        .replace(/\\\|/g, "")
        .split("$")
        .some((piece, i) => i % 2 === 1 && piece.includes("|"));
    if (text.split("\n").some(barInMaths)) {
      add(where, "A table row has a | inside mathematics; write \\lvert and \\rvert there instead");
    }
    try {
      (inline ? renderInline : renderBlock)(text);
    } catch (error) {
      add(where, `Does not render: ${(error as Error).message}`);
    }
    // Examples are read in the light of the whole lesson, so a class defined in one passage may be used in a later one.
    for (const code of pythonExamples(text)) {
      if (!(await checkCode(where, code, shown))) add(where, "A Python example in the text does not parse");
    }
  };
  return { checkCode, checkText };
}

/** The Python examples in a passage. A method shown on its own, indented as it would be in its class, is moved to the margin. */
export const pythonExamples = (text: string) =>
  [...text.matchAll(/```python\n([\s\S]*?)```/g)].map(([, code]) => {
    const lines = code.split("\n");
    const margin = Math.min(...lines.filter((line) => line.trim()).map((line) => line.length - line.trimStart().length));
    return lines.map((line) => line.slice(Number.isFinite(margin) ? margin : 0)).join("\n");
  });

export async function checkQuestion(
  q: Question,
  at: string,
  add: (where: string, message: string) => void,
  run: RunPython,
  checkCode: (where: string, code: string, context?: string) => Promise<boolean>,
  checkText: (where: string, text: string, inline?: boolean) => Promise<void>,
) {
  const passes = async (code: string) => (await run(checkProgram(code, (q as { tests: string }).tests))).error === null;
  switch (q.type) {
    case "numeric": {
      const answer = parseRational(q.answer);
      if (!answer) add(at, `Answer "${q.answer}" is not a number`);
      if (q.tolerance && !parseRational(q.tolerance)) add(at, `Tolerance "${q.tolerance}" is not a number`);
      break;
    }
    case "choice":
      if (q.answer >= q.options.length) add(at, "Answer index is beyond the options");
      if (new Set(q.options).size !== q.options.length) add(at, "Two options are identical");
      for (const option of q.options) await checkText(at, option, true);
      break;
    case "order":
      if (new Set(q.steps).size !== q.steps.length) add(at, "Two steps are identical");
      for (const step of q.steps) await checkText(at, step, true);
      break;
    case "predict": {
      if (!(await checkCode(at, q.code))) add(at, "The code does not parse");
      const result = await run(q.code);
      if (result.error) add(at, `The code fails when run: ${result.error.trim().split("\n").at(-1)}`);
      else if (normaliseOutput(result.out) !== normaliseOutput(q.output)) {
        add(at, `Stated output is wrong. The code really prints: ${JSON.stringify(normaliseOutput(result.out))}`);
      }
      break;
    }
    case "code": {
      if (!(await checkCode(at, q.solution))) add(at, "The reference solution does not parse");
      // The starter may already call what the learner is asked to define.
      const starterParses = await checkCode(at, q.starter, q.solution);
      if (q.mode === "write" && !starterParses) add(at, "The starter does not parse");
      if (!(await passes(q.solution))) add(at, "The reference solution fails its own tests");
      if (await passes(q.starter)) add(at, "The starter already passes the tests");
      for (const [index, wrong] of q.wrong.entries()) {
        if (await passes(wrong)) add(at, `Wrong solution ${index + 1} passes the tests, so the tests are too weak`);
      }
      break;
    }
  }
}

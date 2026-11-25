import { ancestors, type Graph } from "../graph/load";
import type { LessonFile } from "../lessons/load";
import type { RunPython } from "../lessons/node-python";
import { checkQuestion, pythonExamples, textChecks, words, type Issue } from "../lessons/validate";
import { capstone as capstoneSchema, type Capstone } from "./schema";

export type ValidateCapstonesOptions = {
  graph: Graph;
  files: LessonFile[];
  /** Concepts that have a lesson. */
  written: Set<string>;
  /** Which concept first teaches which Python feature. */
  features: Map<string, string[]>;
  figures: Set<string>;
  run: RunPython;
  /** The shortest brief, stage text and review a mini-capstone may have, in words. */
  minWords: number;
  only?: (file: string) => boolean;
};

/**
 * Everything a mini-capstone must satisfy before the learner can see it.
 *
 * Correctness: the same checks as a lesson's questions. Answers parse,
 * predicted outputs are real, reference solutions pass their tests, and wrong
 * solutions and starters fail them.
 *
 * Closeness: it closes a cluster whose lessons are all written, and it leans
 * only on that cluster and its prerequisites, in the concepts it names, the
 * concepts its questions exercise and the Python in its code. It teaches
 * nothing new.
 *
 * Integration: every question says which concepts it exercises, and together
 * they draw on at least half of the cluster's lessons, with at least one
 * question that needs two or more of them at once (where the cluster has two).
 */
export async function validateCapstones(options: ValidateCapstonesOptions): Promise<Issue[]> {
  const { graph, files, written, features, figures, run, minWords } = options;
  const issues: Issue[] = [];
  const seenClusters = new Map<string, string>();

  for (const { file, raw } of files) {
    const add = (where: string, message: string) => issues.push({ file, where, message });
    const parsed = capstoneSchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues.slice(0, 5)) add(issue.path.join(".") || "capstone", issue.message);
      continue;
    }
    const capstone: Capstone = parsed.data;
    const cluster = graph.clusters.get(capstone.cluster);
    if (!cluster) {
      add("cluster", `Unknown cluster ${capstone.cluster}`);
      continue;
    }
    if (seenClusters.has(cluster.id)) {
      add("cluster", `${cluster.id} already has a mini-capstone in ${seenClusters.get(cluster.id)}`);
      continue;
    }
    seenClusters.set(cluster.id, file);
    const unwritten = cluster.concepts.filter((id) => !written.has(id));
    if (unwritten.length > 0) add("cluster", `${cluster.id} is not fully written yet. Missing lessons: ${unwritten.join(", ")}`);
    if (options.only && !options.only(file)) continue;

    const own = new Set(cluster.concepts);
    const known = new Set([...cluster.concepts, ...cluster.concepts.flatMap((id) => [...ancestors(graph, id)])]);
    const allowedPython = new Set([...known].flatMap((id) => features.get(id) ?? []));
    const blocks = capstone.stages.flatMap((stage) => stage.blocks);
    const prose = [capstone.brief, capstone.review, ...blocks.flatMap((block) => ("text" in block ? [block.text] : []))];
    const { checkCode, checkText } = textChecks({
      add,
      mentionable: known,
      allowedPython,
      shown: prose.flatMap(pythonExamples).join("\n"),
      run,
      stray: `which is not in ${cluster.id} or among its prerequisites`,
    });

    await checkText("claim", capstone.claim, true);
    await checkText("brief", capstone.brief);
    await checkText("review", capstone.review);
    if (capstone.starter) await checkCode("starter", capstone.starter);

    const seen = new Set<string>();
    const exercised = new Set<string>();
    let combines = false;
    let writing = 0;
    let slow = 0;
    for (const [s, stage] of capstone.stages.entries()) {
      const stageAt = `stages[${s}]`;
      await checkText(stageAt, stage.title, true);
      if (!stage.blocks.some((block) => "question" in block)) add(stageAt, "A stage needs at least one question, so that finishing it is checked");
      for (const [index, block] of stage.blocks.entries()) {
        const where = `${stageAt}.blocks[${index}]`;
        if ("text" in block) {
          await checkText(where, block.text);
        } else if ("figure" in block) {
          if (!figures.has(block.figure)) add(where, `No figure named ${block.figure}`);
        } else {
          const q = block.question;
          const at = `${where} ${q.id}`;
          if (seen.has(q.id)) add(at, "Duplicate question id");
          seen.add(q.id);
          if (!q.concepts) add(at, "Say which concepts this question exercises");
          for (const id of q.concepts ?? []) {
            if (!known.has(id)) add(at, `Exercises ${id}, which is not in ${cluster.id} or among its prerequisites`);
            else if (own.has(id)) exercised.add(id);
          }
          if ((q.concepts ?? []).filter((id) => own.has(id)).length >= 2) combines = true;
          if (q.type === "code" && q.mode === "write") writing += 1;
          if (q.system === "s2") slow += 1;
          await checkText(at, q.prompt);
          await checkText(at, q.explanation);
          await checkQuestion(q, at, add, run, checkCode, checkText);
        }
      }
    }

    const total = prose.reduce((sum, text) => sum + words(text), 0);
    if (total < minWords) add("capstone", `Only ${total} words; the minimum is ${minWords}`);
    const needed = Math.ceil(cluster.concepts.length / 2);
    if (exercised.size < needed) {
      add("capstone", `Exercises ${exercised.size} of the ${cluster.concepts.length} lessons in ${cluster.id}; a mini-capstone draws on at least ${needed}`);
    }
    if (cluster.concepts.length > 1 && !combines) add("capstone", `No question needs two or more lessons of ${cluster.id} at once`);
    if (slow < 2) add("capstone", `Needs at least two slow (s2) questions; has ${slow}`);
    if (allowedPython.size > 0 && writing < 1) add("capstone", "The learner can write Python by now, so at least one stage must ask for code");
  }
  return issues;
}

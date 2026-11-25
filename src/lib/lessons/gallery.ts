import "server-only";
import { loadGraph } from "../graph/load";
import { teachingPath } from "../learning/next";
import { capstonesDir, graphDir, lessonsDir, loadCapstones, loadLessons } from "./load";
import { PARTS } from "./schema";

export type Placement = { key: string; where: string; name: string; props: Record<string, unknown> };

/**
 * Every figure placed anywhere in the course, in the order Learn teaches them, with each mini-capstone after the
 * lesson that closes its cluster. Always read from the repository's own content, never from a test fixture, because
 * the gallery exists to check the figures a learner will actually see.
 */
export function figurePlacements(root: string = process.cwd()): Placement[] {
  const graph = loadGraph(graphDir(root));
  const lessons = loadLessons(lessonsDir(root));
  const capstones = loadCapstones(capstonesDir(root));
  const out: Placement[] = [];
  const add = (unit: string, title: string, part: string, blocks: unknown[]) => {
    blocks.forEach((block, i) => {
      if (block && typeof block === "object" && "figure" in block) {
        const { figure, props } = block as { figure: string; props?: Record<string, unknown> };
        out.push({ key: `${unit}/${part}/${i}`, where: `${title} · ${part}`, name: figure, props: props ?? {} });
      }
    });
  };
  const routed = teachingPath(graph, new Set(lessons.keys())).path;
  // A lesson Learn cannot reach yet still has figures worth checking, so it goes at the end.
  const order = [...routed, ...[...lessons.keys()].filter((id) => !routed.includes(id))];
  for (const id of order) {
    const lesson = lessons.get(id)!;
    const concept = graph.concepts.get(id)!;
    for (const part of PARTS) add(id, `${concept.cluster} · ${concept.title}`, part, lesson.parts[part]);
    const cluster = graph.clusters.get(concept.cluster)!;
    const capstone = capstones.get(cluster.id);
    if (capstone && cluster.concepts.at(-1) === id) {
      capstone.stages.forEach((stage, s) => add(`capstone.${cluster.id}`, `${cluster.id} mini-capstone · ${capstone.title}`, `stage ${s + 1}`, stage.blocks));
    }
  }
  return out;
}

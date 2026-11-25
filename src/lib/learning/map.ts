import type { Graph, Track } from "../graph/load";
import { nextConcept, nextStep } from "./next";

export type LessonState = "done" | "now" | "written" | "planned";
export type MapLesson = { id: string; title: string; state: LessonState };
export type MapCluster = {
  id: string;
  title: string;
  track: Track;
  state: LessonState;
  requires: string[];
  /** Done lessons in the order they were finished, then the rest in the order Learn gives them, then the planned ones. */
  lessons: MapLesson[];
  /** The mini-capstone that closes the cluster, if one is written. */
  capstone: { title: string; state: "done" | "now" | "written" } | null;
};
export type MapStep = { id: string; title: string; cluster: string; state: "done" | "now" | "written" };
export type MapData = {
  clusters: MapCluster[];
  /** The clusters with something written, in the order Learn reaches them. */
  route: string[];
  /** The clusters with nothing written yet, in the order of the curriculum. */
  ahead: string[];
  /** The lesson Learn gives now, if any. */
  now: string | null;
  /** The cluster whose mini-capstone Learn gives now, if it gives one instead of a lesson. */
  capstoneNow: string | null;
  /** Finished lessons in the order they were finished, then the written lessons in the order Learn will give them. */
  path: MapStep[];
  counts: { done: number; written: number; planned: number; capstones: number; capstonesDone: number };
};

/**
 * Everything the Map shows. The order of lessons comes from `nextConcept`, the
 * rule Learn itself uses, so the Map cannot disagree with Learn.
 *
 * `capstones` are the titles of the mini-capstones written, by cluster, and
 * `capstonesDone` the clusters whose mini-capstone the learner has finished.
 */
export function buildMap(
  graph: Graph,
  written: Set<string>,
  completed: string[],
  capstones: Map<string, string> = new Map(),
  capstonesDone: Set<string> = new Set(),
): MapData {
  const finished = completed.filter((id) => graph.concepts.has(id));
  const done = new Set(finished);
  const step = nextStep(graph, written, new Set(capstones.keys()), finished, capstonesDone);
  const now = step?.kind === "lesson" ? step.id : null;
  const capstoneNow = step?.kind === "capstone" ? step.cluster : null;

  const walked = [...finished];
  for (let next = nextConcept(graph, written, finished)?.id ?? null; next; next = nextConcept(graph, written, walked)?.id ?? null) walked.push(next);
  const path: MapStep[] = walked.map((id) => {
    const concept = graph.concepts.get(id)!;
    return { id, title: concept.title, cluster: concept.cluster, state: done.has(id) ? "done" : id === now ? "now" : "written" };
  });

  const lessonState = (id: string): LessonState => (done.has(id) ? "done" : id === now ? "now" : written.has(id) ? "written" : "planned");

  const position = new Map(walked.map((id, i) => [id, i]));
  const place = (id: string) => position.get(id) ?? Infinity;

  const clusters: MapCluster[] = [...graph.clusters.values()].map((cluster) => {
    const lessons = cluster.concepts
      .map((id) => ({ id, title: graph.concepts.get(id)!.title, state: lessonState(id) }))
      .sort((a, b) => (place(a.id) === place(b.id) ? 0 : place(a.id) - place(b.id)));
    const title = capstones.get(cluster.id);
    const capstone = title === undefined ? null : { title, state: capstonesDone.has(cluster.id) ? ("done" as const) : capstoneNow === cluster.id ? ("now" as const) : ("written" as const) };
    const state: LessonState = capstone?.state === "now"
      ? "now"
      : lessons.every((l) => l.state === "done")
      ? "done"
      : lessons.some((l) => l.state === "now")
        ? "now"
        : lessons.some((l) => l.state !== "planned")
          ? "written"
          : "planned";
    return {
      id: cluster.id,
      title: cluster.title,
      track: cluster.track,
      state,
      requires: cluster.requires,
      lessons,
      capstone,
    };
  });

  const writtenCount = [...written].filter((id) => graph.concepts.has(id)).length;
  return {
    clusters,
    route: [...new Set(path.map((step) => step.cluster))],
    ahead: clusters.filter((cluster) => cluster.state === "planned").map((cluster) => cluster.id),
    now,
    capstoneNow,
    path,
    counts: {
      done: done.size,
      written: writtenCount,
      planned: graph.concepts.size - writtenCount,
      capstones: capstones.size,
      capstonesDone: [...capstones.keys()].filter((id) => capstonesDone.has(id)).length,
    },
  };
}

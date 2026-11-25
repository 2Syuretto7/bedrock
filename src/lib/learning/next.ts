import { topologicalOrder, type Graph } from "../graph/load";

/**
 * Chooses the lesson Learn offers next.
 *
 * A lesson is open when it is written, not yet completed, and every one of its
 * prerequisites is completed. Among open lessons, the next one must build
 * directly on the lesson just finished: it lists that lesson's concept as a
 * prerequisite. It may be in the same track or a different one.
 *
 * `completed` is in the order the learner finished the lessons, oldest first.
 * `builds` is false only if no open lesson builds on the last one, which the
 * lesson checks in CI do not allow to be merged.
 */
export function nextConcept(graph: Graph, written: Set<string>, completed: string[]): { id: string; builds: boolean } | null {
  const done = new Set(completed);
  const open = topologicalOrder(graph).filter(
    (id) => written.has(id) && !done.has(id) && graph.concepts.get(id)!.requires.every((required) => done.has(required)),
  );
  if (open.length === 0) return null;
  const previous = completed.at(-1);
  if (previous === undefined) return { id: open[0], builds: true };
  const building = open.find((id) => graph.concepts.get(id)!.requires.includes(previous));
  return building ? { id: building, builds: true } : { id: open[0], builds: false };
}

/**
 * The lesson Learn will offer once `current` is finished, or null if nothing
 * written is open after it. The "Next" line of a lesson and the Map both read
 * this, so what a lesson says comes next is what Learn then gives.
 */
export function nextAfter(graph: Graph, written: Set<string>, completed: string[], current: string): string | null {
  return nextConcept(graph, written, [...completed.filter((id) => id !== current), current])?.id ?? null;
}

/**
 * Walks the written lessons exactly as Learn will, from the very first one.
 * Returns the order, and a description of the first place the chain breaks.
 */
export function teachingPath(graph: Graph, written: Set<string>): { path: string[]; broken: string | null } {
  const path: string[] = [];
  for (;;) {
    const next = nextConcept(graph, written, path);
    if (!next) break;
    if (!next.builds) {
      return { path, broken: `After ${path.at(-1)} no open lesson builds on it. The next would be ${next.id}, which does not list it as a prerequisite` };
    }
    path.push(next.id);
  }
  const stranded = [...written].filter((id) => graph.concepts.has(id) && !path.includes(id));
  return { path, broken: stranded.length ? `These lessons can never be reached: ${stranded.join(", ")}` : null };
}

export type Step = { kind: "lesson"; id: string; builds: boolean } | { kind: "capstone"; cluster: string };

/**
 * What Learn gives now: a lesson, or the mini-capstone that closes a cluster.
 *
 * A mini-capstone is due when every lesson of its cluster is finished and it is
 * not. If the lesson just finished was the one that closed the cluster, its
 * mini-capstone comes straight away, while the cluster is fresh. Mini-capstones
 * of clusters finished earlier (written after the learner had moved on) never
 * interrupt the chain of lessons: they wait until no lesson is open, and then
 * come in the order their clusters were finished.
 *
 * `capstones` are the clusters that have a mini-capstone written, and
 * `capstonesDone` the clusters whose mini-capstone the learner has finished.
 */
export function nextStep(graph: Graph, written: Set<string>, capstones: Set<string>, completed: string[], capstonesDone: Set<string>): Step | null {
  const finishedAt = new Map(completed.map((id, i) => [id, i]));
  const due = (cluster: string) =>
    capstones.has(cluster) && !capstonesDone.has(cluster) && graph.clusters.get(cluster)!.concepts.every((id) => finishedAt.has(id));

  const last = graph.concepts.get(completed.at(-1) ?? "");
  if (last && due(last.cluster)) return { kind: "capstone", cluster: last.cluster };

  const lesson = nextConcept(graph, written, completed);
  if (lesson) return { kind: "lesson", ...lesson };

  const closed = (cluster: string) => Math.max(...graph.clusters.get(cluster)!.concepts.map((id) => finishedAt.get(id)!));
  const waiting = [...graph.clusters.keys()].filter(due).sort((a, b) => closed(a) - closed(b));
  return waiting.length ? { kind: "capstone", cluster: waiting[0] } : null;
}

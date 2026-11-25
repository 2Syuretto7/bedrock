import { readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { TRACKS, type Track } from "./tracks";

export { TRACKS, type Track };

export type Concept = { id: string; title: string; track: Track; cluster: string; order: number; requires: string[] };
export type Cluster = { id: string; title: string; track: Track; requires: string[]; concepts: string[] };
export type Graph = { concepts: Map<string, Concept>; clusters: Map<string, Cluster> };

type NodeSpec = string | { title: string; id?: string; requires?: string[] };
type TrackFile = { track: Track; title: string; clusters: { id: string; title: string; requires: string[]; nodes: NodeSpec[] }[] };

const FILES = ["foundations.yaml", "software.yaml", "distributed.yaml", "data.yaml", "mlops.yaml", "hardware.yaml", "security.yaml"];

export const slugify = (title: string) =>
  title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * Builds the concept graph from graph/*.yaml.
 * Default edges: each concept requires the one before it in its cluster, and a
 * cluster's first concept requires the last concept of every cluster it lists.
 * A concept can replace its default with an explicit `requires` list of ids.
 */
export function loadGraph(dir: string = path.join(process.cwd(), "graph")): Graph {
  const concepts = new Map<string, Concept>();
  const clusters = new Map<string, Cluster>();
  const explicit = new Set<string>();

  for (const file of FILES) {
    const data = parse(readFileSync(path.join(/* turbopackIgnore: true */ dir, file), "utf8")) as TrackFile;
    for (const c of data.clusters ?? []) {
      if (clusters.has(c.id)) throw new Error(`Duplicate cluster ${c.id}`);
      const cluster: Cluster = { id: c.id, title: c.title, track: data.track, requires: c.requires, concepts: [] };
      clusters.set(c.id, cluster);
      c.nodes.forEach((spec, order) => {
        const node = typeof spec === "string" ? { title: spec } : spec;
        const id = node.id ?? `${c.id.toLowerCase()}.${slugify(node.title)}`;
        if (concepts.has(id)) throw new Error(`Duplicate concept ${id}`);
        if (node.requires) explicit.add(id);
        concepts.set(id, { id, title: node.title, track: data.track, cluster: c.id, order, requires: node.requires ?? [] });
        cluster.concepts.push(id);
      });
    }
  }

  for (const cluster of clusters.values()) {
    for (const required of cluster.requires) {
      if (!clusters.has(required)) throw new Error(`${cluster.id} requires unknown cluster ${required}`);
    }
    cluster.concepts.forEach((id, i) => {
      if (explicit.has(id)) return;
      const concept = concepts.get(id)!;
      concept.requires =
        i > 0 ? [cluster.concepts[i - 1]] : cluster.requires.map((r) => clusters.get(r)!.concepts.at(-1)!);
    });
  }
  for (const concept of concepts.values()) {
    for (const required of concept.requires) {
      if (!concepts.has(required)) throw new Error(`${concept.id} requires unknown concept ${required}`);
    }
  }
  return { concepts, clusters };
}

/** A valid teaching order, or an error naming a concept on a cycle. */
export function topologicalOrder(graph: Graph): string[] {
  const state = new Map<string, 1 | 2>();
  const order: string[] = [];
  const visit = (id: string, trail: string[]) => {
    if (state.get(id) === 2) return;
    if (state.get(id) === 1) throw new Error(`Prerequisite cycle: ${[...trail, id].join(" -> ")}`);
    state.set(id, 1);
    for (const required of graph.concepts.get(id)!.requires) visit(required, [...trail, id]);
    state.set(id, 2);
    order.push(id);
  };
  for (const id of graph.concepts.keys()) visit(id, []);
  return order;
}

/** Every concept that must be mastered before this one, directly or indirectly. */
export function ancestors(graph: Graph, id: string): Set<string> {
  const seen = new Set<string>();
  const stack = [...graph.concepts.get(id)!.requires];
  while (stack.length) {
    const next = stack.pop()!;
    if (seen.has(next)) continue;
    seen.add(next);
    stack.push(...graph.concepts.get(next)!.requires);
  }
  return seen;
}

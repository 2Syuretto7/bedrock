import { describe, expect, it } from "vitest";
import { ancestors, loadGraph, topologicalOrder } from "@/lib/graph/load";
import { teachingPath } from "@/lib/learning/next";

const graph = loadGraph();
const byTrack = (t: string) => [...graph.concepts.values()].filter((c) => c.track === t).length;

/** The order Learn reaches the clusters. The graph alone decides it; this test only holds it in place. */
const ROUTE = ["F0", "S0", "H0", "F1", "S1", "F2", "S2", "F3", "F4", "F5", "S3", "Q0", "Q1", "S4", "S5", "S6", "S7", "H1", "H2", "D0", "F6", "D1", "D2", "F7", "Q2", "Q3", "Q4", "D3", "D4", "D5", "D6", "F8", "R0", "R1", "R2", "R3", "R4", "R5", "R6", "H3", "H4", "H5", "S8", "F9", "F10", "H6", "H7", "H8", "M0", "M1", "D7", "D8", "M2", "H9", "D9", "Q5", "Q6", "Q7", "Q8", "M3", "M4", "M5", "M6", "R7", "D10"];

describe("knowledge graph", () => {
  it("has the planned size", () => {
    expect(["F", "S", "D", "Q", "M", "H", "R"].map(byTrack)).toEqual([103, 86, 110, 76, 57, 86, 65]);
    expect(graph.concepts.size).toBe(583);
    expect(graph.clusters.size).toBe(65);
  });

  it("has no prerequisite cycles", () => {
    expect(topologicalOrder(graph)).toHaveLength(583);
  });

  it("starts from a single root: arithmetic, then programming, then bits", () => {
    const roots = [...graph.concepts.values()].filter((c) => c.requires.length === 0).map((c) => c.id);
    expect(roots).toEqual(["f0.whole-numbers-and-place-value"]);
    expect(graph.concepts.get("s0.what-a-program-is")!.requires).toEqual(["f0.estimation-and-back-of-the-envelope-reasoning"]);
    expect(graph.concepts.get("h0.binary-and-hexadecimal")!.requires).toEqual(["s0.reading-errors-and-debugging"]);
  });

  it("makes every concept reachable from the root", () => {
    for (const concept of graph.concepts.values()) {
      if (concept.requires.length === 0) continue;
      expect(ancestors(graph, concept.id).has("f0.whole-numbers-and-place-value")).toBe(true);
    }
  });

  it("walks the whole curriculum as one chain, as if every lesson were written", () => {
    const { path, broken } = teachingPath(graph, new Set(graph.concepts.keys()));
    expect(broken).toBeNull();
    expect(path).toHaveLength(583);
    const clusters = path.map((id) => graph.concepts.get(id)!.cluster).filter((c, i, all) => c !== all[i - 1]);
    expect(clusters).toEqual(ROUTE);
  });

  it("brings earlier ideas back where they are used again", () => {
    const requires = (id: string) => graph.concepts.get(id)!.requires;
    expect(requires("d5.consistent-hashing")).toContain("s2.hash-tables");
    expect(requires("q3.hash-joins")).toContain("s2.hash-tables");
    expect(requires("h4.cache-lines-sets-and-associativity")).toContain("s2.hash-tables");
    expect(requires("d4.raft-log-replication")).toContain("q2.write-ahead-logging");
    expect(requires("r6.deterministic-simulation-testing")).toContain("d0.testing-concurrent-code-deterministically");
  });
});

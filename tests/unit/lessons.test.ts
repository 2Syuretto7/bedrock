import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadGraph } from "@/lib/graph/load";
import { buildMap } from "@/lib/learning/map";
import { nextAfter, nextConcept, teachingPath } from "@/lib/learning/next";
import { checkProgram, explainFailure, featureProgram } from "@/lib/lessons/harness";
import { FIGURE_NAMES } from "@/lib/lessons/figures";
import { loadLessons, loadPythonFeatures, readLessonFiles, type LessonFile } from "@/lib/lessons/load";
import { runPython } from "@/lib/lessons/node-python";
import { renderBlock } from "@/lib/lessons/render";
import { validateLessons } from "@/lib/lessons/validate";

const root = path.join(import.meta.dirname, "..", "fixtures");
const graph = loadGraph(path.join(root, "graph"));
const features = loadPythonFeatures(path.join(root, "graph"));
const files = () => readLessonFiles(path.join(root, "content", "lessons"));

type Raw = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const check = (changed: LessonFile[] = files(), g = graph) =>
  validateLessons({ graph: g, files: changed, features, figures: new Set<string>(FIGURE_NAMES), run: runPython, minWords: 0 });

/** The fixture lessons with one of them edited. */
async function messages(concept: string, edit: (lesson: Raw) => void) {
  const all = files();
  edit(all.find((f) => (f.raw as Raw).concept === concept)!.raw as Raw);
  return (await check(all)).map((issue) => issue.message).join("\n");
}
const question = (lesson: Raw, id: string): Raw =>
  Object.values(lesson.parts as Record<string, Raw[]>)
    .flat()
    .find((block) => block.question?.id === id)!.question;

describe("lesson validation", () => {
  it("accepts the fixture curriculum", async () => {
    expect(await check()).toEqual([]);
    expect(loadLessons(path.join(root, "content", "lessons")).size).toBe(3);
  });

  it("rejects a reference solution that fails, tests a wrong answer passes, and a starter that already passes", async () => {
    expect(await messages("s0.printing", (l) => (question(l, "write-sum").solution = "total = 41\nprint(total)\n"))).toContain(
      "reference solution fails its own tests",
    );
    expect(await messages("s0.printing", (l) => (question(l, "write-hello").tests = "assert 'pebble' in output.lower()"))).toContain(
      "tests are too weak",
    );
    expect(await messages("s0.printing", (l) => (question(l, "fix-sum").starter = "print(9)\n"))).toContain("starter already passes");
  });

  it("checks assembly questions on the RISC-V machine and holds them to the instructions taught", async () => {
    const asm = (l: Raw, extra: Raw) =>
      (l.parts.work as Raw[]).push({
        question: {
          id: "asm-double",
          type: "code",
          language: "asm",
          mode: "write",
          system: "s2",
          prompt: "Write double.",
          explanation: "Add a0 to itself.",
          starter: "double:\n    ret\n",
          solution: "double:\n    add a0, a0, a0\n    ret\n",
          tests: 'assert call("double", 21).value == 42, "double(21) should be 42"',
          wrong: ["double:\n    addi a0, a0, 2\n    ret\n"],
          ...extra,
        },
      });
    const untaught = await messages("s0.printing", (l) => asm(l, {}));
    expect(untaught).toContain("Uses assembly the learner has not been taught yet: asm:add, asm:ret");
    expect(untaught).not.toContain("fails its own tests");
    expect(untaught).not.toContain("too weak");
    expect(await messages("s0.printing", (l) => asm(l, { wrong: ["double:\n    slli a0, a0, 1\n    ret\n"] }))).toContain("Wrong solution 1 passes the tests");
    expect(await messages("s0.printing", (l) => asm(l, { solution: "double:\n    ad a0, a0, a0\n    ret\n" }))).toContain(
      "The reference solution does not parse",
    );
    const predict = await messages("s0.printing", (l) =>
      (l.parts.drill as Raw[]).push({
        question: { id: "asm-print", type: "predict", language: "asm", system: "s1", prompt: "What does it print?", explanation: "It prints 7.", code: "li a0, 7\nli a7, 1\necall\n", output: "8" },
      }),
    );
    expect(predict).toContain('Stated output is wrong. The code really prints: "7"');
  });

  it("refuses a figure that does not exist, a prop it does not take, a prop of the wrong type, and one that cannot be drawn", async () => {
    const figureAt = (l: Raw, name: string): Raw => (Object.values(l.parts as Record<string, Raw[]>).flat().find((block) => block.figure === name) as Raw);
    expect(await messages("f0.counting", (l) => (figureAt(l, "venn").figure = "venn-diagram"))).toContain("No figure named venn-diagram");
    expect(await messages("f0.counting", (l) => (figureAt(l, "venn").props = { a: 2, size: 3 }))).toContain("Figure venn props");
    expect(await messages("f0.counting", (l) => (figureAt(l, "venn").props = { a: "two" }))).toContain("Figure venn props: a:");
    expect(await messages("f0.counting", (l) => (figureAt(l, "linear-map").props = { map: "spin" }))).toContain("Figure linear-map props: map:");
    expect(await messages("f0.counting", (l) => (figureAt(l, "log-scale").props = { set: "weights" }))).toContain("Figure log-scale props: set:");
    expect(await messages("f0.counting", (l) => (figureAt(l, "log-scale").props = { first: 7 }))).toContain("Figure log-scale props: first:");
    expect(await messages("f0.counting", (l) => (figureAt(l, "step-through").props = { rate: 7 }))).toContain("Figure step-through props: program:");
    expect(await messages("f0.counting", (l) => (figureAt(l, "step-through").props = { program: "fixed-deposit" }))).toContain("Figure step-through props: program:");
    expect(await messages("f0.counting", (l) => (figureAt(l, "step-through").props = { program: "deposit", rate: 3 }))).toContain("Figure step-through props: rate:");
    expect(await messages("f0.counting", (l) => (figureAt(l, "binary-counter").props = { width: 16 }))).toContain("Figure binary-counter props: width:");
    expect(await messages("f0.counting", (l) => (figureAt(l, "binary-counter").props = { value: 256 }))).toContain("Figure binary-counter props: value:");
    expect(await messages("f0.counting", (l) => (figureAt(l, "struct-padding").props = { record: "train" }))).toContain("Figure struct-padding props: record:");
    expect(await messages("f0.counting", (l) => (figureAt(l, "struct-padding").props = { record: "tap", padded: true }))).toContain("Figure struct-padding props:");
    const broken = await validateLessons({
      graph,
      files: files(),
      features,
      figures: new Set<string>(FIGURE_NAMES),
      renderFigure: (name) => (name === "venn" ? "Figure venn does not render: boom" : null),
      run: runPython,
      minWords: 0,
    });
    expect(broken.map((issue) => issue.message)).toContain("Figure venn does not render: boom");
  });

  it("rejects a predicted output that is not what the code prints", async () => {
    expect(await messages("s0.printing", (l) => (question(l, "predict-fast").output = "11"))).toContain('really prints: "2"');
  });

  it("rejects a bar inside mathematics in a table row, which would split the cell", async () => {
    const withTable = (row: string) => (l: Raw) => (question(l, "sum-slow").explanation = `| a | b |\n| --- | --- |\n${row}`);
    expect(await messages("f0.adding", withTable("| size | $|x|$ |"))).toContain("inside mathematics");
    expect(await messages("f0.adding", withTable("| size | $\\lvert x \\rvert$ |"))).not.toContain("inside mathematics");
    expect(await messages("f0.adding", withTable("| $a$ | $b$ |"))).not.toContain("inside mathematics");
  });

  it("rejects answers that are not numbers, and has no place for prepared hints", async () => {
    expect(await messages("f0.adding", (l) => (question(l, "sum-slow").answer = "twelve"))).toContain("is not a number");
    // Hints come from the tutor alone. A lesson that tries to carry its own is malformed.
    expect(await messages("f0.adding", (l) => (question(l, "sum-slow").hints = ["Add them."]))).not.toBe("");
  });

  describe("closeness: only what is learnt, being learnt, or next", () => {
    it("rejects Python the learner has not been taught", async () => {
      const text = await messages("s0.printing", (l) => (question(l, "predict-fast").code = "for i in range(2):\n    print(i)\n"));
      expect(text).toContain("has not been taught yet");
      expect(text).toContain("node:For");
    });
    it("rejects any Python at all before the learner has met Python", async () => {
      expect(await messages("f0.adding", (l) => l.parts.intuition.push({ text: "```python\nprint(3 + 4)\n```" }))).toContain("call:print");
    });
    it("rejects recalling or using a concept that is not a prerequisite", async () => {
      expect(await messages("f0.counting", (l) => l.uses.push("s0.printing"))).toContain("has not met it yet");
    });
    it("rejects mentioning a concept that is neither behind nor directly ahead", async () => {
      expect(await messages("f0.counting", (l) => l.parts.formal.push({ text: "See [[d1.later]]." }))).toContain("Mentions [[d1.later]]");
    });
    it("rejects a question that exercises a concept outside the lesson's reach", async () => {
      expect(await messages("f0.adding", (l) => (question(l, "sum-fast").concepts = ["s0.printing"]))).toContain("Exercises s0.printing");
    });
    it("rejects pointing forward to something that does not depend on this lesson", async () => {
      expect(await messages("f0.adding", (l) => l.leads.push("f0.counting"))).toContain("not what comes next");
    });
  });

  describe("continuity: each lesson builds on the one before", () => {
    it("requires a lesson to recall every direct prerequisite", async () => {
      expect(await messages("s0.printing", (l) => (l.recalls = []))).toContain("Must recall its direct prerequisite f0.adding");
    });
    it("requires a bridge for every direct prerequisite in another track", async () => {
      expect(await messages("s0.printing", (l) => delete l.bridges)).toContain("Must have a bridges entry for f0.adding");
      expect(await messages("s0.printing", (l) => (l.bridges = {}))).toContain("Must have a bridges entry for f0.adding");
    });
    it("rejects a bridge that would never be shown, one that is long, and one that names a concept out of reach", async () => {
      // Counting is a prerequisite of Adding in the same track, and of Printing only indirectly.
      expect(await messages("f0.adding", (l) => (l.bridges = { "f0.counting": "Counting comes first." }))).toContain("its bridge would never be shown");
      expect(await messages("s0.printing", (l) => (l.bridges["f0.counting"] = "Counting comes first."))).toContain("its bridge would never be shown");
      expect(await messages("s0.printing", (l) => (l.bridges["f0.adding"] = "word ".repeat(121)))).toContain("A bridge is short: 121 words");
      expect(await messages("s0.printing", (l) => (l.bridges["f0.adding"] = "Nothing like [[m9.unknown]]."))).toContain("Mentions [[m9.unknown]]");
    });
    it("rejects a half-written cluster", async () => {
      const partial = files().filter((f) => (f.raw as Raw).concept !== "f0.adding");
      expect((await check(partial)).map((i) => i.message).join("\n")).toContain("Half-written cluster");
    });
    it("rejects lessons that do not form one chain", async () => {
      // Make Printing depend on Counting only: after Adding, nothing builds on it.
      const forked = loadGraph(path.join(root, "graph"));
      forked.concepts.get("s0.printing")!.requires = ["f0.counting"];
      const all = files();
      (all.find((f) => (f.raw as Raw).concept === "s0.printing")!.raw as Raw).recalls = ["f0.counting"];
      (all.find((f) => (f.raw as Raw).concept === "s0.printing")!.raw as Raw).uses = [];
      const text = (await check(all, forked)).map((i) => i.message).join("\n");
      expect(text).toMatch(/no open lesson builds on it|can never be reached/);
    });
  });

  it("requires code reading and code writing once the learner knows Python", async () => {
    expect(
      await messages("s0.printing", (l) => {
        l.parts.work = l.parts.work.filter((b: Raw) => b.question.id !== "write-hello");
      }),
    ).toContain("at least two code-writing questions");
  });

  it("requires both fast and slow questions and a minimum depth", async () => {
    expect(await messages("f0.adding", (l) => (question(l, "sum-slow").system = "s1"))).toContain("No slow (s2) question");
    const short = await validateLessons({ graph, files: files(), features, figures: new Set<string>(FIGURE_NAMES), run: runPython, minWords: 500 });
    expect(short.some((i) => i.message.includes("the minimum is 500"))).toBe(true);
  });
});

describe("what a lesson says comes next", () => {
  it("must name the lesson Learn gives next, in its leads and in its connections", async () => {
    expect(await messages("f0.adding", (l) => (l.leads = ["d1.later"]))).toContain("Learn gives s0.printing after this lesson, so leads must list it");
    expect(
      await messages("f0.adding", (l) => {
        l.parts.connections = [{ text: "Nothing about what follows." }];
      }),
    ).toContain("the connections must point to [[s0.printing]]");
  });
  it("shows as Next exactly the lesson Learn then offers, at every step of the path", () => {
    const written = new Set(["f0.counting", "f0.adding", "s0.printing"]);
    const { path } = teachingPath(graph, written);
    path.forEach((id, i) => {
      const done = path.slice(0, i);
      const shown = nextAfter(graph, written, done, id);
      expect(shown).toBe(nextConcept(graph, written, [...done, id])?.id ?? null);
      expect(shown).toBe(path[i + 1] ?? null);
    });
  });
});

describe("choosing the next lesson", () => {
  const written = new Set(["f0.counting", "f0.adding", "s0.printing"]);
  it("starts at the beginning and always moves to a lesson that builds on the last, across tracks", () => {
    expect(nextConcept(graph, written, [])).toEqual({ id: "f0.counting", builds: true });
    expect(nextConcept(graph, written, ["f0.counting"])).toEqual({ id: "f0.adding", builds: true });
    expect(nextConcept(graph, written, ["f0.counting", "f0.adding"])).toEqual({ id: "s0.printing", builds: true });
    expect(nextConcept(graph, written, ["f0.counting", "f0.adding", "s0.printing"])).toBeNull();
  });
  it("never offers a lesson whose prerequisites are unfinished, or one that is not written", () => {
    expect(nextConcept(graph, new Set(["s0.printing", "d1.later"]), [])).toBeNull();
    expect(teachingPath(graph, written)).toEqual({ path: ["f0.counting", "f0.adding", "s0.printing"], broken: null });
  });
});

describe("checking code", () => {
  it("counts a library's attributes as Python to be taught, but not the ones the code defines itself", async () => {
    const code = "class Point:\n    scale = 2\n    def __init__(self, x):\n        self.x = x\n    def double(self):\n        return self.x * self.scale\np = Point(3)\nprint(p.double(), p.x.real)\n";
    const listed = JSON.parse((await runPython(featureProgram(code))).out) as string[];
    expect(listed.filter((feature) => feature.startsWith("attr:"))).toEqual(["attr:real"]);
    expect(listed).toContain("node:ClassDef");
    const use = JSON.parse((await runPython(featureProgram("print(p.x, p.y)\n", code))).out) as string[];
    expect(use.filter((feature) => feature.startsWith("attr:"))).toEqual(["attr:y"]);
  });
  it("lets tests read the learner's names and printed output", async () => {
    const ok = await runPython(checkProgram("x = 2\nprint(x * 3)\n", 'assert x == 2\nassert output == "6\\n"'));
    expect(ok.error).toBeNull();
  });
  it("lets tests rerun the learner's code with different starting values", async () => {
    const code = 'n = 7\nkind = "odd"\nif n % 2 == 0:\n    kind = "even"\nprint(kind)\n';
    const tests = 'assert kind == "odd"\nagain = rerun(n=10)\nassert again["kind"] == "even"\nassert again["output"] == "even\\n"\nassert rerun(n=-3)["kind"] == "odd"';
    expect((await runPython(checkProgram(code, tests))).error).toBeNull();
    const moved = await runPython(checkProgram('kind = "odd"\n', "rerun(n=10)"));
    expect(explainFailure(moved.error!).note).toBe("Keep the line that sets n at the top of your program");
  });
  it("turns a failed test into its message, and a crash into the learner's own traceback", async () => {
    const failed = await runPython(checkProgram("x = 1\n", 'assert x == 2, "x should be 2"'));
    expect(explainFailure(failed.error!)).toEqual({ note: "x should be 2", detail: null });
    const crashed = await runPython(checkProgram("y = 1\nprint(z)\n", "assert True"));
    const { note, detail } = explainFailure(crashed.error!);
    expect(note).toBe("Your code stopped with an error.");
    expect(detail).toContain("line 2");
    expect(detail).toContain("NameError");
    expect(detail).not.toContain("_pyodide");
  });
});

describe("rendering", () => {
  it("renders mathematics and names concepts by their titles", () => {
    const html = renderBlock("Now $a + b$ and [[f0.adding]].", (id) => graph.concepts.get(id)?.title);
    expect(html).toContain("katex");
    expect(html).toContain("Adding");
    expect(html).not.toContain("[[");
  });
});

describe("the map", () => {
  const written = new Set(["f0.counting", "f0.adding", "s0.printing"]);
  it("puts the clusters Learn reaches in order, the unwritten ones after, and marks where the learner is", () => {
    const map = buildMap(graph, written, ["f0.counting"]);
    expect(map.now).toBe("f0.adding");
    expect(map.counts).toEqual({ done: 1, written: 3, planned: 1, capstones: 0, capstonesDone: 0 });
    expect(map.clusters.map((c) => [c.id, c.state])).toEqual(
      expect.arrayContaining([
        ["F0", "now"],
        ["S0", "written"],
        ["D1", "planned"],
      ]),
    );
    expect(map.route).toEqual(["F0", "S0"]);
    expect(map.ahead).toEqual(["D1"]);
    const f0 = map.clusters.find((c) => c.id === "F0")!;
    expect(f0.lessons.map((l) => l.state)).toEqual(["done", "now"]);
    expect(map.clusters.find((c) => c.id === "S0")!.requires).toEqual(["F0"]);
  });
  it("lists lessons in the order Learn gives them", () => {
    expect(buildMap(graph, written, []).path.map((s) => [s.id, s.state])).toEqual([
      ["f0.counting", "now"],
      ["f0.adding", "written"],
      ["s0.printing", "written"],
    ]);
    const all = buildMap(graph, written, ["f0.counting", "f0.adding", "s0.printing"]);
    expect(all.now).toBeNull();
    expect(all.path.every((s) => s.state === "done")).toBe(true);
    expect(all.clusters.find((c) => c.id === "S0")!.state).toBe("done");
  });
});

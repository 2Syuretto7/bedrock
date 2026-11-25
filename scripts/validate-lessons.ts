/**
 * Checks every lesson and mini-capstone before it can be merged. Run by `npm run lessons` and in CI.
 * Needs no network, database or secrets: Python runs under Node.
 *
 * While writing, `npm run lessons -- e1/03` checks only the lesson files whose
 * path contains that text, and `npm run lessons -- capstones/s0` does the same
 * for a mini-capstone. CI always checks everything.
 */
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { validateCapstones } from "../src/lib/capstones/validate";
import { Figure } from "../src/components/lesson/figures";
import { loadGraph } from "../src/lib/graph/load";
import { FIGURE_NAMES } from "../src/lib/lessons/figures";
import {
  capstonesDir,
  graphDir,
  lessonsDir,
  loadPythonFeatures,
  readLessonFiles,
} from "../src/lib/lessons/load";
import { runPython } from "../src/lib/lessons/node-python";
import { validateLessons } from "../src/lib/lessons/validate";

async function main() {
  const filter = process.argv[2];
  // Lesson paths are relative to content/lessons, so a filter beginning "capstones/" can only mean a mini-capstone.
  const forCapstones = filter?.startsWith("capstones/") ? filter.slice("capstones/".length) : undefined;
  const files = readLessonFiles(lessonsDir());
  const capstones = readLessonFiles(capstonesDir());
  const graph = loadGraph(graphDir());
  const features = loadPythonFeatures();
  const figures = new Set<string>(FIGURE_NAMES);
  // Every figure a lesson places is drawn here with its props, as the browser would draw it.
  const renderFigure = (name: string, props: Record<string, unknown>) => {
    try {
      return renderToString(createElement(Figure, { name, props })).includes("<svg") ? null : `Figure ${name} draws nothing`;
    } catch (error) {
      return `Figure ${name} does not render: ${(error as Error).message}`;
    }
  };
  const issues = await validateLessons({
    graph,
    files,
    features,
    figures,
    renderFigure,
    run: runPython,
    minWords: 1200,
    only: forCapstones !== undefined ? () => false : filter ? (file) => file.includes(filter) : undefined,
  });
  const written = new Set(files.map(({ raw }) => String((raw as { concept?: unknown } | null)?.concept)));
  const capstoneIssues = await validateCapstones({
    graph,
    files: capstones,
    written,
    features,
    figures,
    renderFigure,
    run: runPython,
    minWords: 350,
    only: forCapstones !== undefined ? (file) => file.includes(forCapstones) : filter ? () => false : undefined,
  });
  for (const issue of capstoneIssues) issues.push({ ...issue, file: `capstones/${issue.file}` });
  for (const issue of issues)
    console.error(`${issue.file} · ${issue.where}: ${issue.message}`);
  console.log(
    `${files.length} lesson${files.length === 1 ? "" : "s"} and ${capstones.length} mini-capstone${capstones.length === 1 ? "" : "s"} checked, ${issues.length} problem${issues.length === 1 ? "" : "s"}.`,
  );
  process.exit(issues.length ? 1 : 0);
}

void main();

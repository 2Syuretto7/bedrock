import "server-only";
import { loadGraph, type Graph } from "../graph/load";
import { shuffled } from "./grade";
import { capstoneCluster, capstoneQuestions, isCapstoneId, type Capstone } from "../capstones/schema";
import { graphDir, loadCapstones, loadLessons, questionsOf } from "./load";
import { renderBlock, renderInline } from "./render";
import type { Lesson, Question } from "./schema";
import { secondsFor } from "./timing";

type Content = { graph: Graph; lessons: Map<string, Lesson>; /** Mini-capstones by cluster id. */ capstones: Map<string, Capstone> };
let cached: Content | undefined;

/** The curriculum, read once per server instance. It only changes with a deployment. */
export function content(): Content {
  return (cached ??= { graph: loadGraph(graphDir()), lessons: loadLessons(), capstones: loadCapstones() });
}

/** The questions of a lesson (by concept id) or of a mini-capstone (by its capstone id). */
export function questionsIn(unitId: string): Question[] | null {
  const { lessons, capstones } = content();
  if (isCapstoneId(unitId)) {
    const capstone = capstones.get(capstoneCluster(unitId));
    return capstone ? capstoneQuestions(capstone) : null;
  }
  const lesson = lessons.get(unitId);
  return lesson ? questionsOf(lesson) : null;
}

/** A question in a lesson or a mini-capstone, with every question that must be solved to finish that unit. */
export function findQuestion(unitId: string, questionId: string) {
  const questions = questionsIn(unitId);
  const question = questions?.find((q) => q.id === questionId);
  if (!questions || !question) throw new Error("Unknown question");
  return { unitId, questions, question };
}

export const titles = (id: string) => content().graph.concepts.get(id)?.title;
export const blockHtml = (text: string) => renderBlock(text, titles);
export const inlineHtml = (text: string) => renderInline(text, titles);

/** The order options or steps are shown in. Position i on screen is item order[i] in the lesson file. */
export const displayOrder = (conceptId: string, q: Question) =>
  q.type === "choice" ? shuffled(q.options.length, `${conceptId}:${q.id}`) : q.type === "order" ? shuffled(q.steps.length, `${conceptId}:${q.id}`) : [];

/** What the browser is given for a question. Never the answer, the tests or the solution. */
export type QuestionView = {
  id: string;
  number: number;
  type: Question["type"];
  system: "s1" | "s2";
  promptHtml: string;
  unit?: string;
  items?: string[];
  code?: string;
  mode?: "write" | "find-bug";
  starter?: string;
  /** The time limit in seconds. Only System One questions have one. */
  seconds?: number;
  solved: boolean;
  explanationHtml?: string;
};

export function questionView(conceptId: string, q: Question, number: number, solved: boolean): QuestionView {
  const order = displayOrder(conceptId, q);
  const source = q.type === "choice" ? q.options : q.type === "order" ? q.steps : undefined;
  return {
    id: q.id,
    number,
    type: q.type,
    system: q.system,
    promptHtml: blockHtml(q.prompt),
    unit: q.type === "numeric" ? q.unit : undefined,
    items: source && order.map((i) => inlineHtml(source[i])),
    code: q.type === "predict" ? q.code : undefined,
    mode: q.type === "code" ? q.mode : undefined,
    starter: q.type === "code" ? q.starter : undefined,
    seconds: secondsFor(q) ?? undefined,
    solved,
    explanationHtml: solved ? blockHtml(q.explanation) : undefined,
  };
}

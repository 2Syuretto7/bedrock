import type { Concept, Graph } from "@/lib/graph/load";
import { blockHtml, questionView } from "@/lib/lessons/content";
import { questionsOf } from "@/lib/lessons/load";
import { PARTS, type Lesson } from "@/lib/lessons/schema";
import { Figure } from "./figures";
import { LessonEnd, QuestionCard } from "./question-card";

const PART_LABELS: Record<(typeof PARTS)[number], string> = {
  recall: "Recall",
  puzzle: "A puzzle",
  intuition: "Intuition",
  derivation: "Derivation",
  formal: "Formally",
  drill: "Drill",
  work: "Work",
  connections: "Connections",
};

const names = (graph: Graph, ids: string[]) => ids.map((id) => graph.concepts.get(id)?.title ?? id).join(" · ");

export function LessonView({
  lesson,
  concept,
  graph,
  next,
  capstone,
  bridge,
  solved,
  recall,
  consolidation,
}: {
  lesson: Lesson;
  concept: Concept;
  graph: Graph;
  /** The lesson Learn gives after this one, worked out by the same rule Learn uses. */
  next: string | null;
  /** The title of the mini-capstone Learn gives straight after this lesson, if this lesson closes a cluster that has one. */
  capstone?: string | null;
  /** The lesson finished just before this one, when it is a prerequisite from another track, with this lesson's bridge for it. */
  bridge?: { from: Concept; text: string } | null;
  solved: Set<string>;
  /** The Recall part's questions: three fresh ones on earlier ideas, chosen by spaced repetition. */
  recall?: React.ReactNode;
  /** The consolidation set, when every question is solved but the finish was weak. */
  consolidation?: React.ReactNode;
}) {
  const later = lesson.leads.filter((id) => id !== next);
  const numbers = new Map(questionsOf(lesson).map((q, i) => [q.id, i + 1]));
  return (
    <article className="prose-lesson">
      <p className="label">
        {concept.cluster} · {graph.clusters.get(concept.cluster)!.title} · {lesson.minutes} min
      </p>
      <h1>{concept.title}</h1>
      <p className="lesson-claim">{lesson.claim}</p>
      {lesson.recalls.length > 0 ? (
        <p className="lesson-links">
          <span className="label">Builds on</span> {names(graph, lesson.recalls)}
        </p>
      ) : null}
      {bridge ? (
        <aside className="lesson-bridge" aria-label="Bridge from your last lesson">
          <p className="label">
            Bridge from {bridge.from.cluster} · {bridge.from.title}
          </p>
          <div className="lesson-text" dangerouslySetInnerHTML={{ __html: blockHtml(bridge.text) }} />
        </aside>
      ) : null}

      {PARTS.map((part) => (
        <section key={part} className="lesson-part" aria-label={PART_LABELS[part]}>
          <h2 className="label lesson-part-label">{PART_LABELS[part]}</h2>
          {lesson.parts[part].map((block, i) => {
            if ("text" in block) {
              // Lesson text is written and reviewed in this repository.
              return <div key={i} className="lesson-text" dangerouslySetInnerHTML={{ __html: blockHtml(block.text) }} />;
            }
            if ("figure" in block) {
              return <Figure key={i} name={block.figure} props={block.props} />;
            }
            const q = block.question;
            return <QuestionCard key={q.id} view={questionView(lesson.concept, q, numbers.get(q.id)!, solved.has(q.id))} />;
          })}
          {part === "recall" ? recall : null}
        </section>
      ))}

      {capstone ? (
        <p className="lesson-links lesson-next">
          <span className="label">Next</span> Mini-capstone: {capstone}
        </p>
      ) : null}
      {next ? (
        <p className={capstone ? "lesson-links" : "lesson-links lesson-next"}>
          <span className="label">{capstone ? "Then" : "Next"}</span> {names(graph, [next])}
        </p>
      ) : null}
      {later.length > 0 ? (
        <p className="lesson-links">
          <span className="label">Later</span> {names(graph, later)}
        </p>
      ) : null}
      {consolidation}
      <LessonEnd />
    </article>
  );
}

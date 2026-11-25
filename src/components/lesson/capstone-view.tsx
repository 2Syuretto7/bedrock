import type { Capstone } from "@/lib/capstones/schema";
import { capstoneId, capstoneQuestions } from "@/lib/capstones/schema";
import type { Cluster, Graph } from "@/lib/graph/load";
import { blockHtml, inlineHtml, questionView } from "@/lib/lessons/content";
import { Figure } from "./figures";
import { CapstoneReview, LessonEnd, QuestionCard } from "./question-card";

/** A mini-capstone: one small project that closes a cluster, built stage by stage from that cluster's lessons. */
export function CapstoneView({
  capstone,
  cluster,
  graph,
  solved,
}: {
  capstone: Capstone;
  cluster: Cluster;
  graph: Graph;
  solved: Set<string>;
}) {
  const id = capstoneId(cluster.id);
  const questions = capstoneQuestions(capstone);
  const numbers = new Map(questions.map((q, i) => [q.id, i + 1]));
  // The cluster's lessons this project draws on, in the order they were taught.
  const exercised = new Set(questions.flatMap((q) => q.concepts ?? []));
  const drawsOn = cluster.concepts.filter((concept) => exercised.has(concept)).map((concept) => graph.concepts.get(concept)!.title);
  return (
    <article className="prose-lesson">
      <p className="label">
        {cluster.id} · {cluster.title} · Mini-capstone · {capstone.minutes} min
      </p>
      <h1>{capstone.title}</h1>
      {/* Mini-capstone text is written and reviewed in this repository. */}
      <p className="lesson-claim" dangerouslySetInnerHTML={{ __html: inlineHtml(capstone.claim) }} />
      {drawsOn.length > 0 ? (
        <p className="lesson-links">
          <span className="label">Brings together</span> {drawsOn.join(" · ")}
        </p>
      ) : null}

      <section className="lesson-part" aria-label="The project">
        <h2 className="label lesson-part-label">The project</h2>
        <div className="lesson-text" dangerouslySetInnerHTML={{ __html: blockHtml(capstone.brief) }} />
      </section>

      {capstone.stages.map((stage, s) => (
        <section key={s} className="lesson-part" aria-label={`Stage ${s + 1}`}>
          <h2 className="label lesson-part-label">
            Stage {s + 1} of {capstone.stages.length}
          </h2>
          <h3 className="capstone-stage-title" dangerouslySetInnerHTML={{ __html: inlineHtml(stage.title) }} />
          {stage.blocks.map((block, i) => {
            if ("text" in block) return <div key={i} className="lesson-text" dangerouslySetInnerHTML={{ __html: blockHtml(block.text) }} />;
            if ("figure" in block) return <Figure key={i} name={block.figure} props={block.props} />;
            const q = block.question;
            return <QuestionCard key={q.id} view={questionView(id, q, numbers.get(q.id)!, solved.has(q.id))} />;
          })}
        </section>
      ))}

      <CapstoneReview html={blockHtml(capstone.review)} />
      <LessonEnd capstone />
    </article>
  );
}

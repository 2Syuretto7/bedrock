import "katex/dist/katex.min.css";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CapstoneView } from "@/components/lesson/capstone-view";
import { LessonView } from "@/components/lesson/lesson-view";
import { Consolidation } from "@/components/review/consolidation";
import { SpacedRecall } from "@/components/review/spaced-recall";
import { Workspace } from "@/components/workspace/workspace";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { capstoneId, capstoneQuestions } from "@/lib/capstones/schema";
import { nextAfter, nextStep } from "@/lib/learning/next";
import { completeUnit, completedCapstones, completedConcepts, snapshotsFor, solvedQuestions } from "@/lib/learning/service";
import { content } from "@/lib/lessons/content";
import { questionsOf } from "@/lib/lessons/load";
import { tutorConnected } from "@/lib/tutor/config";
import { tutorHistory } from "@/lib/tutor/service";
import type { Db } from "@/lib/db";
import { TRACKS } from "@/lib/graph/tracks";

/** The tutor's conversation on this lesson so far. */
async function tutorSetup(db: Db, userId: string, conceptId: string) {
  return { messages: await tutorHistory(db, userId, conceptId), connected: tutorConnected() };
}

export const metadata: Metadata = { title: "Learn" };
// Writing and checking fresh recall questions can take the model a while. The lesson is shown meanwhile.
export const maxDuration = 300;


const SCRATCH = `# Python runs here, in your browser. Press Run.
total = 0
for n in range(1, 11):
    total = total + n

print("1 + 2 + ... + 10 =", total)
`;

/**
 * Learn is the whole navigation: it works out the one thing to do now.
 * That is a lesson that builds directly on the lesson just finished, or the
 * mini-capstone that closes the cluster just finished.
 */
async function Lesson() {
  const user = await requireUser();
  const db = getDb();
  const { graph, lessons, capstones } = content();
  const written = new Set(lessons.keys());
  const [completed, capstonesDone] = await Promise.all([completedConcepts(db, user.id), completedCapstones(db, user.id)]);
  const next = nextStep(graph, written, new Set(capstones.keys()), completed, capstonesDone);

  if (!next) {
    const [snapshots, tutor] = await Promise.all([snapshotsFor(db, user.id, "bedrock-code:scratch"), tutorSetup(db, user.id, "scratch")]);
    return (
      <Workspace id="scratch" breadcrumb={["Scratch"]} starterCode={SCRATCH} snapshots={snapshots} tutor={tutor}>
        <article className="prose-lesson">
          <p className="label">{lessons.size > 0 ? "Up to date" : "Warm-up"}</p>
          <h1>{lessons.size > 0 ? "You have finished every lesson written so far." : "Your workspace is ready."}</h1>
          <p>
            {lessons.size > 0
              ? "The next batch is being written and checked. It will appear here, and it will build on the lesson you just finished."
              : "Lessons will appear on this side. The first batch is being written and checked now."}
          </p>
          <p>
            Until then the editor is yours. Press <code>Run</code>, or <code>Ctrl</code> + <code>Enter</code>. Your code is
            saved as you type.
          </p>
        </article>
      </Workspace>
    );
  }

  if (next.kind === "capstone") {
    const capstone = capstones.get(next.cluster)!;
    const cluster = graph.clusters.get(next.cluster)!;
    const id = capstoneId(cluster.id);
    const [solved, snapshots, tutor] = await Promise.all([
      solvedQuestions(db, user.id, id),
      snapshotsFor(db, user.id, `bedrock-code:${id}`),
      tutorSetup(db, user.id, id),
    ]);
    const ids = capstoneQuestions(capstone).map((q) => q.id);
    return (
      <Workspace
        key={id}
        id={id}
        breadcrumb={[TRACKS[cluster.track], cluster.title, "Mini-capstone"]}
        starterCode={capstone.starter ?? "# Scratch space. Try things here.\n"}
        language={capstone.language}
        snapshots={snapshots}
        lesson={{ total: ids.length, solved: ids.filter((q) => solved.has(q)), complete: false }}
        tutor={tutor}
      >
        <CapstoneView capstone={capstone} cluster={cluster} graph={graph} solved={solved} />
      </Workspace>
    );
  }

  const lesson = lessons.get(next.id)!;
  const concept = graph.concepts.get(next.id)!;
  const [solved, snapshots, tutor] = await Promise.all([
    solvedQuestions(db, user.id, concept.id),
    snapshotsFor(db, user.id, `bedrock-code:${concept.id}`),
    tutorSetup(db, user.id, concept.id),
  ]);
  const ids = questionsOf(lesson).map((q) => q.id);
  // Every question is solved and the lesson is still open: the finish was weak, and its consolidation set closes it.
  const held = ids.length > 0 && ids.every((id) => solved.has(id));
  if (held && !tutorConnected()) {
    // The model that writes the consolidation set has been disconnected, so the lesson is not kept waiting for it.
    await completeUnit(db, user.id, concept.id);
    redirect("/learn");
  }
  // Finishing this lesson finishes its cluster, so the cluster's mini-capstone comes before the next lesson.
  // The lesson finished just before this one. If it is a prerequisite from another track, this lesson has a bridge for it.
  const previous = graph.concepts.get(completed.at(-1) ?? "");
  const bridgeText = previous ? lesson.bridges?.[previous.id] : undefined;
  const closesCluster = graph.clusters.get(concept.cluster)!.concepts.every((id) => id === concept.id || completed.includes(id));
  return (
    <Workspace
      key={concept.id}
      id={concept.id}
      breadcrumb={[TRACKS[concept.track], graph.clusters.get(concept.cluster)!.title, concept.title]}
      starterCode={lesson.starter ?? "# Scratch space. Try things here.\n"}
      language={lesson.language}
      snapshots={snapshots}
      lesson={{ total: ids.length, solved: ids.filter((id) => solved.has(id)), complete: false, held }}
      tutor={tutor}
    >
      <LessonView
        lesson={lesson}
        concept={concept}
        graph={graph}
        next={nextAfter(graph, written, completed, concept.id)}
        bridge={previous && bridgeText ? { from: previous, text: bridgeText } : null}
        capstone={closesCluster && !capstonesDone.has(concept.cluster) ? capstones.get(concept.cluster)?.title : null}
        solved={solved}
        recall={
          // The lesson does not wait for this: its three recall questions arrive in its Recall part when they are ready.
          <Suspense
            fallback={
              <p className="label recall-spaced-wait" role="status">
                Writing three fresh recall questions
              </p>
            }
          >
            <SpacedRecall userId={user.id} lessonId={concept.id} />
          </Suspense>
        }
        consolidation={
          held ? (
            <Suspense
              fallback={
                <p className="label recall-spaced-wait" role="status">
                  Writing three fresh consolidation questions
                </p>
              }
            >
              <Consolidation userId={user.id} lessonId={concept.id} />
            </Suspense>
          ) : null
        }
      />
    </Workspace>
  );
}

export default function Learn() {
  return (
    <Suspense
      fallback={
        <div className="ws">
          <header className="ws-top">
            <span className="font-mono text-[13px] tracking-[0.32em] text-ink">BEDROCK</span>
            <span className="label" role="status">
              Finding your next lesson
            </span>
          </header>
        </div>
      }
    >
      <Lesson />
    </Suspense>
  );
}

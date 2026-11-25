import { after } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { capstoneCluster, isCapstoneId } from "@/lib/capstones/schema";
import { nextAfter, nextConcept } from "@/lib/learning/next";
import { completedConcepts, solvedQuestions } from "@/lib/learning/service";
import { content, questionsIn } from "@/lib/lessons/content";
import { costMicroUsd, MAX_MESSAGE_CHARS, tutorConnected } from "@/lib/tutor/config";
import { systemPrompt, workspaceNote } from "@/lib/tutor/prompt";
import { failureNote, streamReply } from "@/lib/tutor/reply";
import { shownIn } from "@/lib/review/service";
import { attemptHistory, saveTutorMessage, tutorHints, tutorHistory } from "@/lib/tutor/service";

export const maxDuration = 120;

const body = z.object({
  conceptId: z.string().min(1).max(200),
  message: z.string().trim().min(1).max(MAX_MESSAGE_CHARS),
  questionId: z.string().max(200).nullish(),
  attendingId: z.string().max(200).nullish(),
  code: z.string().max(50_000).optional(),
  output: z.string().max(50_000).optional(),
});

const refuse = (status: number, error: string) => Response.json({ error }, { status });

/**
 * One question to the tutor. The reply streams back as lines of JSON:
 * {"delta": "..."} as text arrives, then {"done": true} or {"error": "..."}.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return refuse(401, "You are signed out. Sign in again to ask the tutor.");
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return refuse(400, `Messages to the tutor can be up to ${MAX_MESSAGE_CHARS} characters.`);
  if (!tutorConnected()) return refuse(503, "The tutor is not connected yet. It needs ANTHROPIC_API_KEY in this deployment.");

  const db = getDb();
  const { graph, lessons, capstones } = content();
  const { conceptId, message, questionId, attendingId, code, output } = parsed.data;
  const lesson = lessons.get(conceptId) ?? null;
  const capstone = isCapstoneId(conceptId) ? (capstones.get(capstoneCluster(conceptId)) ?? null) : null;
  const unit = lesson ?? capstone;
  if (!unit && conceptId !== "scratch") return refuse(404, "That lesson does not exist.");

  const questions = (unit && questionsIn(conceptId)) || [];
  const numbers = new Map(questions.map((q, i) => [q.id, i + 1]));
  const [completed, solved, history, attempts, hints, recall, consolidation] = await Promise.all([
    completedConcepts(db, user.id),
    unit ? solvedQuestions(db, user.id, conceptId) : new Set<string>(),
    tutorHistory(db, user.id, conceptId),
    unit ? attemptHistory(db, user.id, conceptId) : undefined,
    unit ? tutorHints(db, user.id, conceptId) : undefined,
    lesson ? shownIn(db, user.id, conceptId, "recall") : [],
    lesson ? shownIn(db, user.id, conceptId, "consolidation") : [],
  ]);
  const fresh = [
    ...recall.map((row) => ({ ...row, purpose: "recall" as const })),
    ...consolidation.map((row) => ({ ...row, purpose: "consolidation" as const })),
  ].map((row) => ({ ...row, idea: graph.concepts.get(row.conceptId)?.title ?? "an earlier lesson" }));
  const system = systemPrompt({
    graph,
    completed: completed.filter((id) => id !== conceptId),
    lesson,
    capstone,
    next: lesson
      ? nextAfter(graph, new Set(lessons.keys()), completed, lesson.concept)
      : capstone
        ? (nextConcept(graph, new Set(lessons.keys()), completed)?.id ?? null)
        : null,
  });
  const note = workspaceNote(unit, { questionId, attendingId, code, output, solved: [...solved], attempts, hints, fresh });
  await saveTutorMessage(db, user.id, conceptId, "user", message);

  const encoder = new TextEncoder();
  let send: (event: object) => void = () => {};
  let close = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // If the learner leaves mid-reply these fail quietly; the reply is still finished and saved.
      send = (event) => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {}
      };
      close = () => {
        try {
          controller.close();
        } catch {}
      };
    },
  });

  const work = (async () => {
    try {
      const reply = await streamReply({ system, history, numbers, message, note, onText: (delta) => send({ delta }) });
      const cost = costMicroUsd(reply.model, reply.usage);
      let text = reply.text;
      if (reply.refused || !text.trim()) {
        text = "I cannot help with that one. Ask me about the lesson or your code instead.";
        send({ replace: text });
      } else if (reply.cutShort) {
        const tail = "\n\n(The reply was cut short. Ask me to continue.)";
        text += tail;
        send({ delta: tail });
      }
      // The tutor's own judgement of the message. A hint counts only on a real question that was unsolved when it was given.
      const question = reply.turn?.question ? (questions[reply.turn.question - 1] ?? null) : null;
      const judged =
        reply.turn && !reply.refused
          ? { about: reply.turn.about, questionId: question?.id ?? null, hint: reply.turn.hint && question !== null && !solved.has(question.id) }
          : null;
      await saveTutorMessage(db, user.id, conceptId, "assistant", text, cost, judged);
      send({ done: true });
    } catch (error) {
      console.error("tutor", error instanceof Error ? error.name : "error");
      send({ error: failureNote(error) });
    } finally {
      close();
    }
  })();
  after(() => work);

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  });
}

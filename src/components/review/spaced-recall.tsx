import { after } from "next/server";
import { getDb } from "@/lib/db";
import { content } from "@/lib/lessons/content";
import { placeQuestion, writeAhead } from "@/lib/review/prepare";
import { RECALLS_PER_LESSON, recallSet } from "@/lib/review/schedule";
import { memoriesOf, rememberFinishedLessons, shownIn } from "@/lib/review/service";
import { recallView } from "@/lib/review/view";
import { tutorConnected } from "@/lib/tutor/config";
import { RecallCard } from "./recall-card";

/**
 * The questions of a lesson's Recall part: one set of exactly three, each
 * written for this one occasion and never shown again.
 *
 * Which earlier ideas they ask about is decided by the memory model, not by
 * the lesson: see `recallSet`. Once a question has been placed in a lesson it
 * stays there on every visit. The very first lesson has no earlier idea, so it
 * has no recall questions. If a new question cannot be written, its place stays
 * empty until the next visit. An old question is never used instead.
 */
export async function SpacedRecall({ userId, lessonId }: { userId: string; lessonId: string }) {
  const db = getDb();
  let shown = await shownIn(db, userId, lessonId);

  if (tutorConnected() && shown.length < RECALLS_PER_LESSON) {
    await rememberFinishedLessons(db, userId);
    const now = new Date();
    const { lessons } = content();
    const memories = (await memoriesOf(db, userId)).filter((memory) => lessons.has(memory.conceptId) && memory.conceptId !== lessonId);
    const picked = recallSet(
      memories,
      now,
      RECALLS_PER_LESSON - shown.length,
      shown.map((row) => row.conceptId),
    );
    const placed = await Promise.all(picked.map((id) => placeQuestion(db, userId, id, lessonId)));
    if (placed.some(Boolean)) shown = await shownIn(db, userId, lessonId);

    // The ideas the next lesson is likely to ask about get their questions written now, so it rarely has to wait.
    const ahead = recallSet(
      memories.filter((memory) => !picked.includes(memory.conceptId)),
      now,
      RECALLS_PER_LESSON,
    ).filter((id, i, all) => all.indexOf(id) === i);
    after(async () => {
      for (const id of ahead) await writeAhead(db, userId, id, lessonId);
    });
  }

  if (shown.length === 0) return null;
  return (
    <div className="recall-spaced" role="group" aria-label="Recall questions">
      <p className="lesson-text recall-spaced-note">
        {shown.length === 1 ? "One question" : `${shown.length} questions`} on earlier ideas, chosen by spaced repetition. Each is new: you have never seen it before and will never see it
        again. One try each, from memory.
      </p>
      {shown.slice(0, RECALLS_PER_LESSON).map((row, i) => (
        <RecallCard key={row.id} view={recallView(row)} number={i + 1} />
      ))}
    </div>
  );
}

import { getDb } from "@/lib/db";
import { CONSOLIDATION_SIZE } from "@/lib/learning/mastery";
import { consolidationQuestion } from "@/lib/review/prepare";
import { shownIn } from "@/lib/review/service";
import { recallView } from "@/lib/review/view";
import { tutorConnected } from "@/lib/tutor/config";
import { RecallCard } from "./recall-card";

/**
 * The consolidation set of a lesson that was finished weakly: three fresh
 * questions on this same lesson, each written for this one occasion and never
 * shown again. The lesson is finished when all three have been answered.
 */
export async function Consolidation({ userId, lessonId }: { userId: string; lessonId: string }) {
  const db = getDb();
  let shown = await shownIn(db, userId, lessonId, "consolidation");
  if (tutorConnected() && shown.length < CONSOLIDATION_SIZE) {
    // One at a time, so each is written knowing the ones before it and no two are alike.
    for (let place = shown.length; place < CONSOLIDATION_SIZE; place++) await consolidationQuestion(db, userId, lessonId);
    shown = await shownIn(db, userId, lessonId, "consolidation");
  }
  if (shown.length === 0) return null;
  return (
    <section className="lesson-part recall-spaced" aria-label="Consolidation">
      <h2 className="label lesson-part-label">Consolidation</h2>
      <p className="lesson-text recall-spaced-note">
        Every question is solved, but with enough wrong tries, hints or slow answers that the idea is not secure yet. These {CONSOLIDATION_SIZE} questions on this lesson are new: you
        have never seen them before and will never see them again. One try each. The lesson is finished when all are answered.
      </p>
      {shown.slice(0, CONSOLIDATION_SIZE).map((row, i) => (
        <RecallCard key={row.id} view={recallView(row)} number={i + 1} kind="consolidation" />
      ))}
    </section>
  );
}

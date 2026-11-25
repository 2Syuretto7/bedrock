import { recallChance } from "../review/schedule";

/**
 * Mastery of a lesson, from 0 to 1. It is always computed from the record of
 * answers, never stored, and it is more than "every question was answered
 * correctly once". It weighs:
 *
 * - accuracy: a question solved at the first try counts in full, and each wrong
 *   try before the right one counts against it;
 * - hints: each hint the tutor gave on the question before it was solved counts against it;
 * - speed: on a timed (System One) question, an answer in the first half of the
 *   time counts in full, and a slower one counts for less. Untimed (System Two)
 *   questions have no speed;
 * - recency: newer answers weigh more than older ones, and mastery fades as the
 *   lesson goes unpractised, by the same forgetting curve that schedules recall.
 */

/** A lesson finished below this is a weak finish, and is followed by a short consolidation set. */
export const WEAK_FINISH = 0.7;
/** How many fresh questions a consolidation set has. */
export const CONSOLIDATION_SIZE = 3;
/** An answer this many days old weighs half as much as one given now. */
export const HALF_LIFE_DAYS = 30;

const DAY = 86_400_000;

/** One answer in the record. `seconds` is the question's time limit, or null if it is not timed. */
export type Answered = { questionId: string; correct: boolean; hintsUsed: number; ms: number | null; at: Date; seconds: number | null };

/** What one question, or one fresh recall or consolidation question, says about mastery. */
export type Evidence = { score: number; at: Date };

/** 1 for an answer in the first half of the time allowed, falling evenly to 0.6 for one given as the time ran out. */
export function speedFactor(ms: number | null, seconds: number | null): number {
  if (ms === null || seconds === null) return 1;
  const used = ms / (seconds * 1000);
  return used <= 0.5 ? 1 : Math.max(0.6, 1 - 0.8 * (used - 0.5));
}

/** How well one question was solved, from 0 to 1. `tries` are its answers, oldest first. */
export function questionScore(tries: Answered[]): Evidence | null {
  if (tries.length === 0) return null;
  const solvedAt = tries.findIndex((attempt) => attempt.correct);
  if (solvedAt === -1) return { score: 0, at: tries.at(-1)!.at };
  const solved = tries[solvedAt];
  const accuracy = 1 / (1 + solvedAt);
  const hints = 1 / (1 + 0.5 * Math.max(0, solved.hintsUsed));
  return { score: accuracy * hints * speedFactor(solved.ms, solved.seconds), at: solved.at };
}

/** The evidence in a lesson's own questions: one item for each question that has been tried. */
export function lessonEvidence(answers: Answered[]): Evidence[] {
  const byQuestion = new Map<string, Answered[]>();
  for (const answer of [...answers].sort((a, b) => a.at.getTime() - b.at.getTime())) {
    byQuestion.set(answer.questionId, [...(byQuestion.get(answer.questionId) ?? []), answer]);
  }
  return [...byQuestion.values()].flatMap((tries) => questionScore(tries) ?? []);
}

/** The evidence in a fresh question, which gets one try: nothing for a miss, and its speed for a recall. */
export const freshEvidence = (answer: { correct: boolean; ms: number | null; at: Date; seconds: number | null }): Evidence => ({
  score: answer.correct ? speedFactor(answer.ms, answer.seconds) : 0,
  at: answer.at,
});

/** The average of the evidence, each item weighted by how recent it is. Null if there is none. */
export function quality(evidence: Evidence[], now: Date): number | null {
  let total = 0;
  let weights = 0;
  for (const item of evidence) {
    const weight = Math.pow(0.5, Math.max(0, now.getTime() - item.at.getTime()) / DAY / HALF_LIFE_DAYS);
    total += weight * item.score;
    weights += weight;
  }
  return weights === 0 ? null : total / weights;
}

/**
 * Mastery now: how well the lesson was done, weighted towards recent answers,
 * times the chance that it is still remembered. `memory` is the lesson's place
 * in the recall schedule, if it has one.
 */
export function mastery(evidence: Evidence[], now: Date, memory?: { stability: number; lastReviewedAt: Date } | null): number | null {
  const done = quality(evidence, now);
  if (done === null) return null;
  const kept = memory ? recallChance(memory.stability, (now.getTime() - memory.lastReviewedAt.getTime()) / DAY) : 1;
  return done * kept;
}

/** Whether a lesson whose questions are all solved was finished weakly. */
export const weakFinish = (answers: Answered[], now: Date) => (quality(lessonEvidence(answers), now) ?? 1) < WEAK_FINISH;

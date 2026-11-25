/**
 * When a finished lesson comes back for review.
 *
 * This is the FSRS-4.5 memory model with its published default weights. Each
 * finished lesson has two numbers:
 *
 * - stability: how many days it takes for the chance of recalling the lesson to
 *   fall to 90%. A lesson recalled correctly gains stability, so the gap to its
 *   next review grows. The gain is largest when the review came late and the
 *   lesson was still recalled, and smallest when it came early.
 * - difficulty: from 1 to 10. It rises when a review is missed and falls back
 *   slowly towards the middle. Hard lessons gain stability more slowly.
 *
 * An idea is recalled with one question and one try, so there are two outcomes:
 * recalled or not. It is due when its chance of recall has fallen to the target.
 *
 * Nothing here is a screen of its own. The ideas that are due are recalled in
 * the Recall part of whichever lesson the learner opens next.
 */

const W = [0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755];
const DECAY = -0.5;
const FACTOR = 19 / 81;
const AGAIN = 1;
const GOOD = 3;

/** The chance of recall at which a lesson is brought back. */
export const TARGET_RECALL = 0.9;
export const MIN_INTERVAL_DAYS = 1;
export const MAX_INTERVAL_DAYS = 365;
/** A lesson's Recall part is one set of exactly this many fresh questions, no more and no fewer. */
export const RECALLS_PER_LESSON = 3;

const DAY = 86_400_000;
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

export type Memory = {
  /** Days for the chance of recall to fall to 90%. */
  stability: number;
  /** 1 (easy) to 10 (hard). */
  difficulty: number;
  reps: number;
  lapses: number;
  lastReviewedAt: Date;
  dueAt: Date;
};

/** The chance, from 0 to 1, that the lesson would be recalled `days` after it was last seen. */
export const recallChance = (stability: number, days: number) => Math.pow(1 + (FACTOR * Math.max(0, days)) / stability, DECAY);

/** Days until the chance of recall falls to the target. */
export const intervalDays = (stability: number) =>
  clamp((stability / FACTOR) * (Math.pow(TARGET_RECALL, 1 / DECAY) - 1), MIN_INTERVAL_DAYS, MAX_INTERVAL_DAYS);

const initialDifficulty = (rating: number) => clamp(W[4] - (rating - 3) * W[5], 1, 10);

const dueAfter = (from: Date, stability: number) => new Date(from.getTime() + intervalDays(stability) * DAY);

const HARD = 2;

/**
 * The memory of a lesson at the moment it is finished. Finishing it counts as a
 * first successful recall: an ordinary one, or a hard one after a weak finish,
 * which brings the lesson back in about a day instead of about four.
 */
export function firstMemory(finishedAt: Date, weak = false): Memory {
  const rating = weak ? HARD : GOOD;
  const stability = W[rating - 1];
  return { stability, difficulty: initialDifficulty(rating), reps: 0, lapses: 0, lastReviewedAt: finishedAt, dueAt: dueAfter(finishedAt, stability) };
}

/** The memory after a review answered at `now`. */
export function afterReview(memory: Memory, recalled: boolean, now: Date): Memory {
  const days = (now.getTime() - memory.lastReviewedAt.getTime()) / DAY;
  const recall = recallChance(memory.stability, days);
  const rating = recalled ? GOOD : AGAIN;
  const { stability: s, difficulty: d } = memory;

  const difficulty = clamp(W[7] * initialDifficulty(GOOD) + (1 - W[7]) * (d - W[6] * (rating - 3)), 1, 10);
  const stability = recalled
    ? s * (1 + Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) * (Math.exp(W[10] * (1 - recall)) - 1))
    : Math.min(s, W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - recall)));

  return {
    stability: Math.max(0.1, stability),
    difficulty,
    reps: memory.reps + 1,
    lapses: memory.lapses + (recalled ? 0 : 1),
    lastReviewedAt: now,
    dueAt: dueAfter(now, Math.max(0.1, stability)),
  };
}

export type Due = { conceptId: string; stability: number; lastReviewedAt: Date; dueAt: Date };

const chanceNow = (m: Due, now: Date) => recallChance(m.stability, (now.getTime() - m.lastReviewedAt.getTime()) / DAY);

/** The lessons due at `now`, the one most likely to have been forgotten first. */
export const reviewQueue = (memories: Due[], now: Date): string[] =>
  memories
    .filter((m) => m.dueAt.getTime() <= now.getTime())
    .sort((a, b) => chanceNow(a, now) - chanceNow(b, now) || a.conceptId.localeCompare(b.conceptId))
    .map((m) => m.conceptId);

/**
 * The ideas a lesson's Recall part asks about, one for each of its empty places.
 *
 * Ideas that are due come first, the most forgotten first. If they do not fill
 * the set, the ideas that will be due soonest fill it. An idea already in the
 * set is passed over while there are others, so the set is as varied as the
 * learner's past allows. Only when fewer ideas exist than places, which happens
 * in the first few lessons, is an idea asked about more than once, each time
 * with a different question. With no finished lesson there is nothing to recall.
 */
export function recallSet(memories: Due[], now: Date, places: number, already: string[] = []): string[] {
  const due = reviewQueue(memories, now);
  const later = memories
    .filter((m) => !due.includes(m.conceptId))
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime() || a.conceptId.localeCompare(b.conceptId))
    .map((m) => m.conceptId);
  const order = [...due, ...later];
  if (order.length === 0) return [];
  const uses = new Map(order.map((id) => [id, already.filter((used) => used === id).length]));
  const picked: string[] = [];
  while (picked.length < Math.max(0, places)) {
    // The idea used least so far in this set; among equals, the most pressing.
    const next = order.reduce((best, id) => (uses.get(id)! < uses.get(best)! ? id : best), order[0]);
    picked.push(next);
    uses.set(next, uses.get(next)! + 1);
  }
  return picked;
}

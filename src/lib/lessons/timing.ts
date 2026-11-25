/**
 * Which questions are timed.
 *
 * System One questions (s1) are fast retrieval: the learner should be able to
 * answer from memory, so each has a time limit and a countdown. System Two
 * questions (s2) are slow reasoning: they are never timed, and the time spent
 * on them is not measured or stored.
 */
const DEFAULT_SECONDS = { choice: 30, numeric: 60, predict: 60, order: 60, code: 180 } as const;

/** A little slack for the answer's journey to the server. */
export const GRACE_MS = 2000;

type Timed = { system: "s1" | "s2"; type: keyof typeof DEFAULT_SECONDS; seconds?: number };

/** The time limit of a question in seconds, or null if it is not timed. */
export const secondsFor = (q: Timed): number | null => (q.system === "s1" ? (q.seconds ?? DEFAULT_SECONDS[q.type]) : null);

/** Whether an answer that took `ms` came after the question's time was up. Never true for an untimed question. */
export function late(q: Timed, ms: number): boolean {
  const seconds = secondsFor(q);
  return seconds !== null && !(ms <= seconds * 1000 + GRACE_MS);
}

/** 45 becomes "45 s" and 180 becomes "3 min". */
export const spoken = (seconds: number) => (seconds % 60 === 0 ? `${seconds / 60} min` : `${seconds} s`);

/** 75 becomes "1:15". */
export const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

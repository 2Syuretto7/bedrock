import { and, desc, eq, gte } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { loginAttempts } from "@/lib/db/schema";

export const WINDOW_MS = 15 * 60 * 1000;
export const MAX_FAILURES_PER_IP = 5;
/** Consecutive failures from anywhere that are free before global back-off starts. */
export const GLOBAL_FREE_FAILURES = 5;
export const GLOBAL_MAX_WAIT_S = 15 * 60;

/** Seconds every caller must wait after the latest failure: 2, 4, 8 ... capped at 15 minutes. */
export function globalBackoffSeconds(consecutiveFailures: number): number {
  const over = consecutiveFailures - GLOBAL_FREE_FAILURES;
  if (over <= 0) return 0;
  return Math.min(2 ** Math.min(over, 20), GLOBAL_MAX_WAIT_S);
}

export type Limit = { allowed: true } | { allowed: false; retryAfterSeconds: number };

export async function checkRateLimit(db: Db, ipHash: string, now: Date = new Date()): Promise<Limit> {
  const windowStart = new Date(now.getTime() - WINDOW_MS);

  const ipFailures = await db
    .select({ at: loginAttempts.attemptedAt })
    .from(loginAttempts)
    .where(
      and(eq(loginAttempts.ipHash, ipHash), eq(loginAttempts.succeeded, false), gte(loginAttempts.attemptedAt, windowStart)),
    )
    .orderBy(desc(loginAttempts.attemptedAt))
    .limit(MAX_FAILURES_PER_IP);

  if (ipFailures.length >= MAX_FAILURES_PER_IP) {
    const oldest = ipFailures[ipFailures.length - 1].at;
    const retry = Math.ceil((oldest.getTime() + WINDOW_MS - now.getTime()) / 1000);
    return { allowed: false, retryAfterSeconds: Math.max(retry, 1) };
  }

  // Global: count failures since the most recent success, newest first.
  const recent = await db
    .select({ at: loginAttempts.attemptedAt, ok: loginAttempts.succeeded })
    .from(loginAttempts)
    .where(gte(loginAttempts.attemptedAt, windowStart))
    .orderBy(desc(loginAttempts.attemptedAt))
    .limit(64);
  let streak = 0;
  for (const row of recent) {
    if (row.ok) break;
    streak += 1;
  }
  const wait = globalBackoffSeconds(streak);
  if (wait > 0) {
    const retry = Math.ceil((recent[0].at.getTime() + wait * 1000 - now.getTime()) / 1000);
    if (retry > 0) return { allowed: false, retryAfterSeconds: retry };
  }
  return { allowed: true };
}

export async function recordAttempt(db: Db, ipHash: string, succeeded: boolean, now: Date = new Date()) {
  await db.insert(loginAttempts).values({ ipHash, succeeded, attemptedAt: now });
}

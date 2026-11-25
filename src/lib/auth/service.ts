import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";
import { decoyHash, hashPassphrase, verifyPassphrase } from "./hash";
import { generatePassphrase, looksLikePassphrase, normalisePassphrase } from "./passphrase";
import { checkRateLimit, recordAttempt } from "./rate-limit";

export const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const TOUCH_AFTER_MS = 60 * 60 * 1000;

export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export async function learnerExists(db: Db): Promise<boolean> {
  const rows = await db.select({ id: users.id }).from(users).limit(1);
  return rows.length > 0;
}

async function createSession(db: Db, userId: string, userAgent: string | null, now: Date) {
  const token = randomBytes(32).toString("base64url");
  await db.insert(sessions).values({
    userId,
    tokenHash: sha256(token),
    userAgent: userAgent?.slice(0, 300) ?? null,
    createdAt: now,
    lastSeenAt: now,
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
  });
  return token;
}

export type SignUpResult = { ok: true; passphrase: string; token: string } | { ok: false; reason: "closed" };

/** Creates the single learner. The unique index makes a second sign-up impossible, even in a race. */
export async function signUp(db: Db, userAgent: string | null, now: Date = new Date()): Promise<SignUpResult> {
  if (await learnerExists(db)) return { ok: false, reason: "closed" };
  const passphrase = generatePassphrase();
  // Hash the normalised form, the same form sign-in verifies against.
  const passphraseHash = await hashPassphrase(normalisePassphrase(passphrase));
  const inserted = await db.insert(users).values({ passphraseHash }).onConflictDoNothing().returning({ id: users.id });
  if (inserted.length === 0) return { ok: false, reason: "closed" };
  const token = await createSession(db, inserted[0].id, userAgent, now);
  return { ok: true, passphrase, token };
}

export type SignInResult =
  | { ok: true; token: string }
  | { ok: false; reason: "invalid" }
  | { ok: false; reason: "rate_limited"; retryAfterSeconds: number };

export async function signIn(
  db: Db,
  input: string,
  ipHash: string,
  userAgent: string | null,
  now: Date = new Date(),
): Promise<SignInResult> {
  const limit = await checkRateLimit(db, ipHash, now);
  if (!limit.allowed) return { ok: false, reason: "rate_limited", retryAfterSeconds: limit.retryAfterSeconds };

  const normalised = normalisePassphrase(input);
  const candidates = await db.select().from(users).limit(1);
  const user = candidates[0];
  // Always spend one Argon2 verification, so timing says nothing about why it failed.
  const encoded = user?.passphraseHash ?? (await decoyHash());
  const matches = (await verifyPassphrase(encoded, normalised)) && looksLikePassphrase(normalised) && Boolean(user);

  await recordAttempt(db, ipHash, matches, now);
  if (!matches || !user) return { ok: false, reason: "invalid" };
  return { ok: true, token: await createSession(db, user.id, userAgent, now) };
}

/** Returns the learner for a session token, extending the session as it is used. */
export async function userForToken(db: Db, token: string | undefined, now: Date = new Date()) {
  if (!token || token.length > 200) return null;
  const rows = await db
    .select({ sessionId: sessions.id, userId: sessions.userId, lastSeenAt: sessions.lastSeenAt })
    .from(sessions)
    .where(and(eq(sessions.tokenHash, sha256(token)), gt(sessions.expiresAt, now)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (now.getTime() - row.lastSeenAt.getTime() > TOUCH_AFTER_MS) {
    await db
      .update(sessions)
      .set({ lastSeenAt: now, expiresAt: new Date(now.getTime() + SESSION_TTL_MS) })
      .where(eq(sessions.id, row.sessionId));
  }
  return { id: row.userId, sessionId: row.sessionId };
}

export async function deleteExpiredSessions(db: Db, now: Date = new Date()) {
  await db.delete(sessions).where(sql`${sessions.expiresAt} <= ${now}`);
}

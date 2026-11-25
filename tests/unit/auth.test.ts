import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/lib/db/schema";
import { MAX_FAILURES_PER_IP, WINDOW_MS } from "@/lib/auth/rate-limit";
import { SESSION_TTL_MS, sha256, signIn, signUp, userForToken } from "@/lib/auth/service";
import { migrate } from "../../scripts/migrate";

const url = process.env.TEST_DATABASE_URL ?? "postgres://bedrock:bedrock@localhost:5432/bedrock_test";
const pool = new Pool({ connectionString: url });
const db = drizzle(pool, { schema });

beforeAll(async () => {
  await migrate(url, () => {});
});
beforeEach(async () => {
  await pool.query("truncate users, sessions, login_attempts restart identity cascade");
});
afterAll(async () => {
  await pool.end();
});

async function createLearner() {
  const result = await signUp(db, "vitest");
  if (!result.ok) throw new Error("sign-up failed");
  return result;
}

describe("sign-up", () => {
  it("creates one learner and stores only an Argon2id hash", async () => {
    const { passphrase, token } = await createLearner();
    const users = await db.select().from(schema.users);
    expect(users).toHaveLength(1);
    expect(users[0].passphraseHash.startsWith("$argon2id$v=19$m=65536,t=3,p=1$")).toBe(true);
    for (const word of passphrase.split(" ")) expect(users[0].passphraseHash).not.toContain(word);
    const sessions = await db.select().from(schema.sessions);
    expect(sessions[0].tokenHash).toBe(sha256(token));
    expect(sessions[0].tokenHash).not.toBe(token);
  });

  it("closes after the first learner, even when two requests race", async () => {
    const results = await Promise.all([signUp(db, null), signUp(db, null)]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(await signUp(db, null)).toEqual({ ok: false, reason: "closed" });
    expect(await db.select().from(schema.users)).toHaveLength(1);
  });
});

describe("sign-in", () => {
  it("accepts the passphrase however it is pasted", async () => {
    const { passphrase } = await createLearner();
    const messy = `  ${passphrase.toUpperCase().split(" ").join(" - ")}\n`;
    const result = await signIn(db, messy, "ip-a", "vitest");
    expect(result.ok).toBe(true);
  });

  it("accepts a stored passphrase that contains hyphenated words", async () => {
    const { hashPassphrase } = await import("@/lib/auth/hash");
    const { normalisePassphrase } = await import("@/lib/auth/passphrase");
    const phrase = "yo-yo t-shirt abacus banana cactus daisy";
    await db.insert(schema.users).values({ passphraseHash: await hashPassphrase(normalisePassphrase(phrase)) });
    expect((await signIn(db, phrase, "ip-a", null)).ok).toBe(true);
    expect((await signIn(db, "yoyo tshirt abacus banana cactus daisy", "ip-a", null)).ok).toBe(false);
  });

  it("rejects a wrong passphrase, and any passphrase when no learner exists", async () => {
    expect(await signIn(db, "one two three four five six", "ip-a", null)).toEqual({ ok: false, reason: "invalid" });
    await createLearner();
    expect(await signIn(db, "one two three four five six", "ip-b", null)).toEqual({ ok: false, reason: "invalid" });
  });

  it("locks an address out after five failures, even with the right passphrase", async () => {
    const { passphrase } = await createLearner();
    const start = new Date("2026-01-01T00:00:00Z");
    for (let i = 0; i < MAX_FAILURES_PER_IP; i++) {
      const r = await signIn(db, "wrong wrong wrong wrong wrong wrong", "ip-x", null, new Date(start.getTime() + i * 1000));
      expect(r).toEqual({ ok: false, reason: "invalid" });
    }
    const blocked = await signIn(db, passphrase, "ip-x", null, new Date(start.getTime() + 10_000));
    expect(blocked.ok).toBe(false);
    expect(blocked).toMatchObject({ reason: "rate_limited" });

    const later = await signIn(db, passphrase, "ip-x", null, new Date(start.getTime() + WINDOW_MS + 11_000));
    expect(later.ok).toBe(true);
  });

  it("backs off globally when failures arrive from many addresses", async () => {
    const { passphrase } = await createLearner();
    const start = new Date("2026-01-01T00:00:00Z");
    for (let i = 0; i < 8; i++) {
      await db.insert(schema.loginAttempts).values({ ipHash: `ip-${i}`, succeeded: false, attemptedAt: new Date(start.getTime() + i) });
    }
    // Eight consecutive failures: 2^(8-5) = 8 seconds of back-off for everyone.
    const tooSoon = await signIn(db, passphrase, "ip-fresh", null, new Date(start.getTime() + 3000));
    expect(tooSoon).toMatchObject({ ok: false, reason: "rate_limited" });
    const afterWait = await signIn(db, passphrase, "ip-fresh", null, new Date(start.getTime() + 9000));
    expect(afterWait.ok).toBe(true);
  });
});

describe("sessions", () => {
  it("resolves a valid token and extends it with use", async () => {
    const { token } = await createLearner();
    const now = new Date();
    const user = await userForToken(db, token, now);
    expect(user?.id).toBeTruthy();

    const nextDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    await userForToken(db, token, nextDay);
    const [session] = await db.select().from(schema.sessions);
    expect(session.expiresAt.getTime()).toBe(nextDay.getTime() + SESSION_TTL_MS);
  });

  it("rejects unknown, missing and expired tokens", async () => {
    const { token } = await createLearner();
    expect(await userForToken(db, undefined)).toBeNull();
    expect(await userForToken(db, "not-a-token")).toBeNull();
    const afterExpiry = new Date(Date.now() + SESSION_TTL_MS + 1000);
    expect(await userForToken(db, token, afterExpiry)).toBeNull();
  });
});

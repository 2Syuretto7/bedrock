import { describe, expect, it } from "vitest";
import words from "@/lib/auth/eff-wordlist.json";
import { generatePassphrase, looksLikePassphrase, normalisePassphrase, WORD_COUNT } from "@/lib/auth/passphrase";
import { globalBackoffSeconds, GLOBAL_MAX_WAIT_S } from "@/lib/auth/rate-limit";

describe("passphrase", () => {
  it("uses the full EFF list of 7,776 unique lowercase words", () => {
    expect(words).toHaveLength(7776);
    expect(new Set(words).size).toBe(7776);
    expect(words.every((w: string) => /^[a-z]+(-[a-z]+)*$/.test(w))).toBe(true);
  });

  it("generates six dictionary words", () => {
    const parts = generatePassphrase().split(" ");
    expect(parts).toHaveLength(WORD_COUNT);
    for (const part of parts) expect(words).toContain(part);
  });

  it("does not repeat across many generations", () => {
    const seen = new Set(Array.from({ length: 500 }, () => generatePassphrase()));
    expect(seen.size).toBe(500);
  });

  it("normalises the ways people paste", () => {
    const expected = "abacus banana cactus daisy eagle falcon";
    expect(normalisePassphrase("  Abacus  banana\ncactus-daisy, EAGLE falcon ")).toBe(expected);
    expect(looksLikePassphrase(expected)).toBe(true);
    expect(looksLikePassphrase("abacus banana")).toBe(false);
  });
});

describe("hyphenated list words", () => {
  it("still look like a passphrase after normalising", () => {
    const hyphenated = (words as string[]).filter((w) => w.includes("-"));
    expect(hyphenated.length).toBeGreaterThan(0);
    const phrase = [...hyphenated.slice(0, 2), "abacus", "banana", "cactus", "daisy"].join(" ");
    expect(looksLikePassphrase(normalisePassphrase(phrase))).toBe(true);
  });
});

describe("global back-off", () => {
  it("is free for the first five failures, then doubles up to the cap", () => {
    expect([0, 3, 5].map(globalBackoffSeconds)).toEqual([0, 0, 0]);
    expect([6, 7, 8, 9].map(globalBackoffSeconds)).toEqual([2, 4, 8, 16]);
    expect(globalBackoffSeconds(40)).toBe(GLOBAL_MAX_WAIT_S);
  });
});

import { describe, expect, it } from "vitest";
import { freshEvidence, lessonEvidence, mastery, quality, questionScore, speedFactor, weakFinish, WEAK_FINISH, type Answered } from "@/lib/learning/mastery";
import { firstMemory, intervalDays } from "@/lib/review/schedule";

const T0 = new Date("2026-03-01T09:00:00Z");
const DAY = 86_400_000;
const later = (days: number) => new Date(T0.getTime() + days * DAY);
const answer = (questionId: string, correct: boolean, more: Partial<Answered> = {}): Answered => ({ questionId, correct, hintsUsed: 0, ms: null, at: T0, seconds: null, ...more });

describe("mastery", () => {
  it("weighs speed on timed questions only", () => {
    expect(speedFactor(5_000, 30)).toBe(1);
    expect(speedFactor(15_000, 30)).toBe(1);
    expect(speedFactor(30_000, 30)).toBeCloseTo(0.6);
    expect(speedFactor(22_500, 30)).toBeCloseTo(0.8);
    // An untimed (System Two) question has no speed, however long it took.
    expect(speedFactor(null, null)).toBe(1);
    expect(speedFactor(900_000, null)).toBe(1);
  });

  it("counts wrong tries and tutor hints against a question", () => {
    expect(questionScore([answer("a", true)])!.score).toBe(1);
    expect(questionScore([answer("a", false), answer("a", true)])!.score).toBe(0.5);
    expect(questionScore([answer("a", false), answer("a", false), answer("a", true)])!.score).toBeCloseTo(1 / 3);
    expect(questionScore([answer("a", true, { hintsUsed: 2 })])!.score).toBe(0.5);
    expect(questionScore([answer("a", true, { ms: 30_000, seconds: 30 })])!.score).toBeCloseTo(0.6);
    // Tried and never solved counts as nothing; never tried is not evidence at all.
    expect(questionScore([answer("a", false)])!.score).toBe(0);
    expect(questionScore([])).toBeNull();
    // What happens after a question is solved does not change how it was solved.
    expect(questionScore([answer("a", true), answer("a", false)])!.score).toBe(1);
  });

  it("weighs recent answers more than old ones", () => {
    const old = { score: 0, at: T0 };
    const recent = { score: 1, at: later(30) };
    // Thirty days is the half-life: the old miss weighs half as much as the recent success.
    expect(quality([old, recent], later(30))).toBeCloseTo(2 / 3);
    expect(quality([{ score: 1, at: T0 }, { score: 0, at: later(30) }], later(30))).toBeCloseTo(1 / 3);
    expect(quality([], T0)).toBeNull();
  });

  it("fades as the lesson goes unrecalled", () => {
    const evidence = lessonEvidence([answer("a", true), answer("b", true)]);
    const memory = firstMemory(T0);
    expect(mastery(evidence, T0, memory)).toBe(1);
    // When the lesson is due, the chance of recalling it has fallen to 90%.
    expect(mastery(evidence, later(intervalDays(memory.stability)), memory)).toBeCloseTo(0.9);
    expect(mastery(evidence, later(200), memory)!).toBeLessThan(0.5);
    expect(mastery([], T0, memory)).toBeNull();
  });

  it("counts a fresh question by its one try and its speed", () => {
    expect(freshEvidence({ correct: true, ms: 10_000, at: T0, seconds: 60 }).score).toBe(1);
    expect(freshEvidence({ correct: true, ms: 60_000, at: T0, seconds: 60 }).score).toBeCloseTo(0.6);
    expect(freshEvidence({ correct: false, ms: 10_000, at: T0, seconds: 60 }).score).toBe(0);
  });

  it("calls a finish weak when every question is solved but not securely", () => {
    expect(WEAK_FINISH).toBe(0.7);
    const clean = [answer("a", true), answer("b", true), answer("c", true, { ms: 5_000, seconds: 30 })];
    expect(weakFinish(clean, T0)).toBe(false);
    // One slip in three is not weak.
    expect(weakFinish([answer("a", false), answer("a", true), answer("b", true), answer("c", true)], T0)).toBe(false);
    // Wrong tries on most questions is.
    expect(weakFinish([answer("a", false), answer("a", true), answer("b", false), answer("b", false), answer("b", true), answer("c", true)], T0)).toBe(true);
    // So is leaning on the tutor's hints, or answering timed questions as the clock runs out.
    expect(weakFinish([answer("a", true, { hintsUsed: 2 }), answer("b", true, { hintsUsed: 2 }), answer("c", true)], T0)).toBe(true);
    expect(weakFinish([answer("a", true, { ms: 29_000, seconds: 30 }), answer("b", true, { ms: 59_000, seconds: 60 })], T0)).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { clock, GRACE_MS, late, secondsFor, spoken } from "@/lib/lessons/timing";

describe("which questions are timed", () => {
  it("times every System One question and no System Two question", () => {
    for (const type of ["choice", "numeric", "predict", "order", "code"] as const) {
      expect(secondsFor({ system: "s1", type })).toBeGreaterThan(0);
      expect(secondsFor({ system: "s2", type })).toBeNull();
      // Not even a limit written on a System Two question makes it timed. The lesson checks refuse such a question.
      expect(late({ system: "s2", type, seconds: 10 }, 10 ** 9)).toBe(false);
    }
    expect(secondsFor({ system: "s1", type: "choice" })).toBe(30);
    expect(secondsFor({ system: "s1", type: "numeric" })).toBe(60);
    expect(secondsFor({ system: "s1", type: "numeric", seconds: 20 })).toBe(20);
  });

  it("counts an answer as late only once the limit and a little slack have passed", () => {
    const q = { system: "s1", type: "choice" } as const;
    expect(late(q, 0)).toBe(false);
    expect(late(q, 30_000 + GRACE_MS)).toBe(false);
    expect(late(q, 30_001 + GRACE_MS)).toBe(true);
    // A time that is not a number is not in time.
    expect(late(q, Number.NaN)).toBe(true);
    expect(late(q, Infinity)).toBe(true);
  });

  it("writes limits and clocks plainly", () => {
    expect(spoken(45)).toBe("45 s");
    expect(spoken(180)).toBe("3 min");
    expect(clock(75)).toBe("1:15");
    expect(clock(9)).toBe("0:09");
  });
});

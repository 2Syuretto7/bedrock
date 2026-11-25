import { describe, expect, it } from "vitest";
import { grade, normaliseOutput, shuffled } from "@/lib/lessons/grade";
import { parseRational, sameNumber } from "@/lib/lessons/number";
import type { Question } from "@/lib/lessons/schema";

const common = { id: "q", system: "s1" as const, prompt: "p", explanation: "e" };
const same = (a: string, b: string) => sameNumber(parseRational(a)!, parseRational(b)!);

describe("numbers", () => {
  it("treats equal values written differently as equal", () => {
    expect(same("0.75", "3/4")).toBe(true);
    expect(same("75%", "3/4")).toBe(true);
    expect(same("1 1/2", "1.5")).toBe(true);
    expect(same("-0.5", "-1/2")).toBe(true);
    expect(same("1,200", "1200")).toBe(true);
    expect(same("0.1", "1/9")).toBe(false);
    expect(same("6/8", "3/4")).toBe(true);
  });
  it("is exact where floating point is not", () => {
    const sum = parseRational("0.1")!;
    const third = { n: sum.n * 3n, d: sum.d };
    expect(sameNumber({ n: 3n, d: 10n }, { n: third.n, d: third.d })).toBe(true);
  });
  it("rejects things that are not numbers", () => {
    for (const bad of ["", "abc", "1/0", "1..2", "--3", "3/", "1 2 3"]) expect(parseRational(bad)).toBeNull();
  });
});

describe("grading", () => {
  it("grades numeric answers exactly or within a tolerance", () => {
    const exact: Question = { ...common, type: "numeric", answer: "3/4" };
    expect(grade(exact, "0.75").correct).toBe(true);
    expect(grade(exact, "0.76").correct).toBe(false);
    expect(grade(exact, "three quarters")).toMatchObject({ correct: false, note: expect.any(String) });
    const approx: Question = { ...common, type: "numeric", answer: "3.14159", tolerance: "0.01" };
    expect(grade(approx, "3.14").correct).toBe(true);
    expect(grade(approx, "3.2").correct).toBe(false);
  });
  it("grades choices, predicted output and orderings", () => {
    const choice: Question = { ...common, type: "choice", options: ["a", "b", "c"], answer: 1 };
    expect(grade(choice, 1).correct).toBe(true);
    expect(grade(choice, 2).correct).toBe(false);
    const predict: Question = { ...common, type: "predict", code: "print(1)", output: "1\n" };
    expect(grade(predict, "1  \n\n").correct).toBe(true);
    expect(grade(predict, "2").correct).toBe(false);
    const order: Question = { ...common, type: "order", steps: ["x", "y", "z"] };
    expect(grade(order, [0, 1, 2]).correct).toBe(true);
    expect(grade(order, [1, 0, 2]).correct).toBe(false);
  });
  it("normalises output and shuffles stably without leaving the answer in place", () => {
    expect(normaliseOutput("a \r\nb\n\n")).toBe("a\nb");
    expect(shuffled(5, "seed")).toEqual(shuffled(5, "seed"));
    for (const seed of ["a", "b", "c", "d", "e", "f"]) expect(shuffled(3, seed)).not.toEqual([0, 1, 2]);
    expect([...shuffled(6, "x")].sort()).toEqual([0, 1, 2, 3, 4, 5]);
  });
  it("accepts both international and Indian digit grouping", () => {
    const big: Question = { ...common, type: "numeric", answer: "1000000" };
    expect(grade(big, "1,000,000").correct).toBe(true);
    expect(grade(big, "10,00,000").correct).toBe(true);
    expect(grade(big, "100,000").correct).toBe(false);
  });
});

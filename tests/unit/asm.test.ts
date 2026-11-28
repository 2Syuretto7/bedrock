import { describe, expect, it } from "vitest";
import { checkProgram, explainFailure, featureProgram, runProgram } from "@/lib/lessons/harness";
import { runPython } from "@/lib/lessons/node-python";

const SUM = `.data
nums:  .word 3, -4, 10, 25
count: .word 4
label: .asciz "sum: "
.text
main:
    la   t0, nums
    lw   t1, count
    li   a0, 0
loop:
    beqz t1, done
    lw   t2, 0(t0)
    add  a0, a0, t2
    addi t0, t0, 4
    addi t1, t1, -1
    j    loop
done:
    mv   s1, a0
    la   a0, label
    li   a7, 4
    ecall
    mv   a0, s1
    li   a7, 1
    ecall
`;

const MAX = `main:
    li   a0, 4
    li   a1, 9
    li   a2, -2
    call max3
    li   a7, 1
    ecall
    li   a7, 10
    ecall
max3:
    bge  a0, a1, first
    mv   a0, a1
first:
    bge  a0, a2, done
    mv   a0, a2
done:
    ret
`;

const asm = (code: string, registers = true) => runPython(runProgram(code, "asm", registers));
const check = (code: string, tests: string) => runPython(checkProgram(code, tests, "asm"));

describe("the RISC-V assembly runtime", () => {
  it("runs a program, prints through system calls and lists the registers it changed", async () => {
    const plain = await asm(SUM, false);
    expect(plain).toEqual({ out: "sum: 34\n", error: null });
    const shown = await asm(SUM);
    expect(shown.out).toContain("sum: 34\nAfter 38 instructions: ");
    expect(shown.out).toContain("a0 = 34");
    expect(shown.out).toContain("t0 = 0x10010010");
    expect(shown.out).toContain("a7 = 1");
  });

  it("wraps arithmetic at 32 bits and follows RISC-V on division by zero", async () => {
    const run = await asm(
      `li t0, 0x7fffffff
addi t0, t0, 1
srai t1, t0, 4
srli t2, t0, 4
li a0, 7
div a1, a0, zero
rem a2, a0, zero
li a3, -7
li a4, 2
div a5, a3, a4
rem a6, a3, a4
`,
    );
    expect(run.error).toBeNull();
    expect(run.out).toContain("t0 = 0x80000000, t1 = 0xf8000000, t2 = 0x8000000");
    expect(run.out).toContain("a1 = -1, a2 = 7, a3 = -7, a4 = 2, a5 = -3, a6 = -1");
  });

  it("tells signed from unsigned in comparisons, shifts and loads", async () => {
    const run = await asm(
      `.data
b: .byte 0xF0
.text
li t0, -1
li t1, 1
slt a0, t0, t1
sltu a1, t0, t1
la t2, b
lb a2, 0(t2)
lbu a3, 0(t2)
bltu t0, t1, wrong
li a4, 5
wrong:
`,
    );
    expect(run.out).toContain("a0 = 1");
    expect(run.out).not.toContain("a1 =");
    expect(run.out).toContain("a2 = -16, a3 = 240, a4 = 5");
  });

  it("names the line of an error in assembly or at run time", async () => {
    const cases: [string, string][] = [
      ["li a0, 1\naddd a0, a0, a0\n", "line 2: unknown instruction addd"],
      ["addi a0, zero, 5000\n", "line 1: the immediate 5000 does not fit in 12 bits for addi"],
      ["j nowhere\n", "line 1: there is no label called nowhere"],
      ["li a0, 0x10010002\nlw a1, 0(a0)\n", "line 2: reads address 0x10010002, which is not a multiple of 4"],
      ["lw a1, 0(zero)\n", "line 1: reads address 0x0, which is not memory the program may use"],
      ["loop:\n    j loop\n", "line 2: stopped after 1,000,000 instructions; look for a loop that never ends"],
      ["li a7, 99\necall\n", "line 2: ecall with a7 = 99 is not a service this machine offers"],
    ];
    for (const [code, message] of cases) {
      const run = await asm(code);
      expect(run.error, code).toContain(`AssemblyError: ${message}`);
      expect(explainFailure(run.error!, "asm")).toEqual({ note: "Your assembly stopped with an error.", detail: expect.stringContaining(message) });
    }
  });

  it("checks a question: tests read registers and memory, rerun with other data and call one function", async () => {
    const tests = `assert output == "sum: 34", "The program should print sum: 34"
assert reg("s1") == 34 and word("nums", 3) == 25
again = run(words={"nums": [1, 2, 3, 4], "count": 3})
assert again.output == "sum: 6", again.output
assert steps == 38`;
    expect((await check(SUM, tests)).error).toBeNull();
    const calls = `assert call("max3", 4, 9, -2).value == 9
assert call("max3", -4, -9, -2).value == -2
assert call("max3", 7, 7, 7).clobbered == []
assert output == "9"`;
    expect((await check(MAX, calls)).error).toBeNull();
    const failed = await check(MAX.replace("bge  a0, a2, done", "blt  a0, a2, done"), 'assert call("max3", 1, 2, 3).value == 3, "max3(1, 2, 3) should be 3"');
    expect(explainFailure(failed.error!, "asm")).toEqual({ note: "max3(1, 2, 3) should be 3", detail: null });
  });

  it("reports a function that does not restore the registers its caller relies on", async () => {
    const careless = `double:
    mv s0, a0
    add a0, s0, s0
    ret
`;
    const run = await check(careless, 'assert call("double", 21).value == 42\nassert call("double", 21).clobbered == [], "double should keep s0"');
    expect(explainFailure(run.error!, "asm").note).toBe("double should keep s0");
  });

  it("lists the instructions and directives a program uses, so lessons can be held to what was taught", async () => {
    expect(JSON.parse((await runPython(featureProgram(SUM, "", "asm"))).out)).toEqual([
      "asm:.asciz",
      "asm:.data",
      "asm:.text",
      "asm:.word",
      "asm:add",
      "asm:addi",
      "asm:beqz",
      "asm:ecall",
      "asm:j",
      "asm:la",
      "asm:li",
      "asm:lw",
      "asm:mv",
    ]);
    expect((await runPython(featureProgram("add a0, a1\n", "", "asm"))).out.trim()).toBe("syntax-error");
  });
});

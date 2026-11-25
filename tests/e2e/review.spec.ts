import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { Client } from "pg";

// Runs after the fixture lessons are all finished, as the same learner.
test.describe.configure({ mode: "serial" });

const url = process.env.E2E_DATABASE_URL ?? "postgres://bedrock:bedrock@localhost:5432/bedrock_e2e";
const MOCK = "http://localhost:3199";

async function sql<T extends Record<string, unknown>>(text: string, values: unknown[] = []): Promise<T[]> {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    return (await client.query(text, values)).rows as T[];
  } finally {
    await client.end();
  }
}

const recall = (page: Page) => page.getByRole("region", { name: "Recall", exact: true });
const spaced = (page: Page) => page.getByRole("group", { name: "Recall questions" });
const card = (page: Page, n: number) => page.getByRole("region", { name: `Fresh recall question ${n}`, exact: true });
const begin = (page: Page, n: number) => card(page, n).getByRole("button", { name: "Start" }).click();
/** The number of sheep in the first field, which the stand-in model changes with every question it writes. */
const sheep = async (page: Page, n: number) => Number((await card(page, n).locator(".q-prompt").innerText()).match(/has (\d+) sheep/)![1]);

async function answer(page: Page, n: number, value: string) {
  await card(page, n).getByRole("textbox").fill(value);
  await card(page, n).getByRole("button", { name: "Check" }).click();
}

test("a lesson's Recall is one set of exactly three questions never seen before, chosen by spaced repetition", async ({ page, request }) => {
  // Reopen the last lesson, as though the two before it were finished five weeks ago and nothing has been recalled since.
  await sql("delete from lesson_progress where concept_id in ('s0.printing', 'capstone.s0')");
  await sql("delete from attempts where concept_id in ('s0.printing', 'capstone.s0')");
  await sql("update lesson_progress set completed_at = completed_at - interval '35 days', started_at = started_at - interval '35 days'");
  await sql("delete from review_questions");
  await sql("delete from review_states");

  await page.goto("/learn");
  // There is no review screen: Learn gives the lesson, and the recall questions are inside its Recall part.
  await expect(page.getByRole("heading", { level: 1, name: "Printing" })).toBeVisible();
  await expect(spaced(page)).toBeVisible({ timeout: 30_000 });
  await expect(recall(page).locator(spaced(page))).toBeVisible();
  await expect(spaced(page)).toContainText("3 questions on earlier ideas, chosen by spaced repetition.");
  // The lesson's own words introduce the part, and it has no written questions of its own: the three fresh ones are the only set.
  await expect(recall(page)).toContainText("In Adding you added counts by hand.");
  await expect(recall(page).getByRole("region")).toHaveCount(3);
  await expect(card(page, 1)).toBeVisible();
  await expect(card(page, 2)).toBeVisible();
  await expect(card(page, 3)).toBeVisible();
  await expect(card(page, 4)).toHaveCount(0);

  // Recall is fast retrieval, so each is timed: hidden until started, then a countdown.
  await expect(card(page, 1)).toContainText("Recall 1 · New question · One try · Timed, 1 min");
  await expect(card(page, 1).locator(".q-prompt")).toHaveCount(0);
  await expect(card(page, 1).getByRole("timer")).toHaveCount(0);
  await begin(page, 1);
  await expect(card(page, 1).getByRole("timer")).toHaveText(/^0:5\d|1:00$/);
  await begin(page, 2);
  await begin(page, 3);

  // Only two earlier ideas exist, so one is asked about twice, and all three questions are different.
  const counts = [await sheep(page, 1), await sheep(page, 2), await sheep(page, 3)];
  expect(new Set(counts).size).toBe(3);
  // The questions are the model's own text: mathematics is typeset, and raw HTML is shown as text, not run.
  await expect(card(page, 1).locator(".katex").first()).toBeVisible();
  await expect(card(page, 1).locator("b")).toHaveCount(0);
  await expect(card(page, 1)).toContainText("<b>How many</b>");
  // Neither the answer nor the lesson an idea came from is in the page before it is answered.
  expect(await page.content()).not.toContain("Count on from 10");
  await expect(spaced(page)).not.toContainText("From ");

  // What the model was sent: an earlier lesson, and the same model and care as the tutor.
  const sent = (await (await request.get(`${MOCK}/last`)).json()) as {
    body: { model: string; output_config: { effort: string; format: { type: string } }; system: { text: string; cache_control?: unknown }[] };
  };
  expect(sent.body.model).toBe("claude-opus-5-5");
  expect(sent.body.output_config.effort).toBe("medium");
  expect(sent.body.output_config.format.type).toBe("json_schema");
  expect(sent.body.system[0].text).toMatch(/# The lesson under review\nLesson: (Counting|Adding)\n/);
  expect(sent.body.system[0].cache_control).toEqual({ type: "ephemeral", ttl: "1h" });

  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).exclude(".cm-scroller").analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes[0]?.target})`)).toEqual([]);

  // A reload shows the same three questions; they are not written again and no fourth is added.
  await page.reload();
  await expect(spaced(page)).toBeVisible({ timeout: 30_000 });
  await begin(page, 1);
  await begin(page, 2);
  await begin(page, 3);
  expect([await sheep(page, 1), await sheep(page, 2), await sheep(page, 3)]).toEqual(counts);
  expect((await sql("select 1 from review_questions where shown_in = 's0.printing'")).length).toBe(3);

  // Something that is not a number does not use up the one try.
  await answer(page, 1, "twelve");
  await expect(card(page, 1)).toContainText("Enter a number");
  await answer(page, 1, String(counts[0] + 10));
  await expect(card(page, 1)).toContainText("Recalled");
  await expect(card(page, 1)).toContainText("Count on from 10");
  await expect(card(page, 1)).toContainText(/From (Counting|Adding)\. It comes back in \d+ days?, with a different question\./);
  await expect(card(page, 1).getByRole("button", { name: "Check" })).toBeDisabled();
  await expect(card(page, 1).getByRole("timer")).toHaveCount(0);

  // The second is answered wrongly: the answer is shown, and the idea comes back within days.
  await answer(page, 2, "1");
  await expect(card(page, 2)).toContainText("Missed");
  await expect(card(page, 2)).toContainText("Not this time. The answer is:");
  await expect(card(page, 2)).toContainText(`${counts[1] + 10} sheep`);
  await expect(card(page, 2)).toContainText(/It comes back in [1-9] days?, with a different question\./);
  await answer(page, 3, String(counts[2] + 10));
  await expect(card(page, 3)).toContainText("Recalled");
  await spaced(page).scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/screens/recall-spaced-laptop.png" });

  // They do not count towards finishing the lesson, and they are still there, answered, on the next visit.
  await expect(page.getByText("0 of 5 questions solved")).toBeVisible();
  await page.reload();
  await expect(card(page, 1)).toContainText("Recalled");
  await expect(card(page, 2)).toContainText("Missed");
  await expect(card(page, 3)).toContainText("Recalled");
  await expect(card(page, 2).getByRole("button", { name: "Check" })).toBeDisabled();
  await expect(card(page, 4)).toHaveCount(0);

  const asked = await sql<{ concept_id: string; correct: boolean; shown_in: string; fingerprint: string }>(
    "select concept_id, correct, shown_in, fingerprint from review_questions where shown_in = 's0.printing' order by id",
  );
  expect(asked.map((row) => row.correct)).toEqual([true, false, true]);
  expect(new Set(asked.map((row) => row.concept_id))).toEqual(new Set(["f0.counting", "f0.adding"]));
  expect(new Set(asked.map((row) => row.fingerprint)).size).toBe(3);
  const states = await sql<{ concept_id: string; lapses: number; days: number }>(
    "select concept_id, lapses, extract(epoch from due_at - now()) / 86400 as days from review_states order by due_at",
  );
  // The missed idea is back within days; the recalled one is weeks away.
  expect(states[0]).toMatchObject({ concept_id: asked[1].concept_id, lapses: 1 });
  expect(Number(states[0].days)).toBeLessThan(7);
  expect(Number(states[1].days)).toBeGreaterThan(14);
});

test("the next lesson's set is three more questions, none of them seen before", async ({ page }) => {
  // As though the three questions had been answered in an earlier lesson.
  const before = await sql<{ prompt: string }>("select question->>'prompt' as prompt from review_questions where answered_at is not null");
  expect(before).toHaveLength(3);
  await sql("update review_questions set shown_in = 'f0.adding' where answered_at is not null");

  await page.goto("/learn");
  await expect(page.getByRole("heading", { level: 1, name: "Printing" })).toBeVisible();
  await expect(spaced(page)).toBeVisible({ timeout: 30_000 });
  await expect(spaced(page)).toContainText("3 questions on earlier ideas");
  await expect(card(page, 3)).toBeVisible();
  await expect(card(page, 4)).toHaveCount(0);
  for (const n of [1, 2, 3]) {
    await begin(page, n);
    const count = await sheep(page, n);
    for (const old of before) expect(old.prompt).not.toContain(`has ${count} sheep`);
    await answer(page, n, String(count + 10));
    await expect(card(page, n)).toContainText("Recalled");
  }

  const rows = await sql<{ answered: boolean; fingerprint: string; concept_id: string }>(
    "select answered_at is not null as answered, fingerprint, concept_id from review_questions where answered_at is not null order by id",
  );
  expect(rows).toHaveLength(6);
  expect(new Set(rows.map((row) => `${row.concept_id} ${row.fingerprint}`)).size).toBe(6);
});

test("System One questions are timed and System Two questions are not", async ({ page }) => {
  // The page's clock is controlled, so a minute's countdown can run out at once. The server keeps its own time.
  await page.clock.install();
  await page.goto("/learn");
  await expect(page.getByRole("heading", { level: 1, name: "Printing" })).toBeVisible();
  const slow = page.getByRole("region", { name: "Question 1", exact: true });
  const fast = page.getByRole("region", { name: "Question 2", exact: true });

  // System Two: shown at once, no clock, and no time is stored for it.
  await expect(slow).toContainText("Question 1 · Think · Not timed");
  await expect(slow.locator(".q-prompt")).toBeVisible();
  await expect(slow.getByRole("button", { name: "Start" })).toHaveCount(0);
  await slow.getByRole("textbox").fill("nonsense");
  await slow.getByRole("button", { name: "Check" }).click();
  await expect(slow).toContainText("Not yet");
  await expect(slow.getByRole("timer")).toHaveCount(0);

  // System One: hidden until started, then a countdown. When it runs out the attempt is a miss and the question hides again.
  await expect(fast).toContainText("Question 2 · Quick · Timed, 1 min");
  await expect(fast.locator(".q-prompt")).toHaveCount(0);
  await fast.getByRole("button", { name: "Start" }).click();
  await expect(fast.locator(".q-prompt")).toBeVisible();
  await expect(fast.getByRole("timer")).toHaveText(/^(1:00|0:5\d)$/);
  await page.clock.fastForward(61_000);
  await expect(fast).toContainText("Time is up.");
  await expect(fast.locator(".q-prompt")).toHaveCount(0);
  await expect(fast.getByRole("timer")).toHaveCount(0);
  await page.screenshot({ path: "test-results/screens/timed-out-laptop.png" });

  // Started again and answered in time, it is solved and the clock goes away.
  await fast.getByRole("button", { name: "Start again" }).click();
  await fast.getByRole("textbox").fill("2");
  await fast.getByRole("button", { name: "Check" }).click();
  await expect(fast).toContainText("Solved");
  await expect(fast.getByRole("timer")).toHaveCount(0);

  const rows = await sql<{ question_id: string; correct: boolean; ms: number | null; answer: unknown }>(
    "select question_id, correct, ms, answer from attempts where concept_id = 's0.printing' order by id",
  );
  expect(rows.map((row) => [row.question_id, row.correct])).toEqual([
    ["predict-sum", false],
    ["predict-fast", false],
    ["predict-fast", true],
  ]);
  expect(rows[0].ms).toBeNull();
  expect(rows[1]).toMatchObject({ ms: 60_000, answer: { timedOut: true } });
  // Measured by the server, from the second Start to the answer's arrival.
  expect(rows[2].ms).toBeGreaterThan(0);
  expect(rows[2].ms).toBeLessThan(60_000);
  // Across everything this learner has answered: every System One attempt has a time, and no System Two attempt has one.
  const [timing] = await sql<{ s1_untimed: string; s2_timed: string }>(
    "select count(*) filter (where system = 's1' and ms is null) as s1_untimed, count(*) filter (where system = 's2' and ms is not null) as s2_timed from attempts",
  );
  expect(timing).toEqual({ s1_untimed: "0", s2_timed: "0" });
});

test("a weak finish is held open for a consolidation set of three fresh questions, and mastery is shown", async ({ page }) => {
  // The three code questions were solved only after two wrong tries each. Question 1 is the last one unsolved.
  const [{ id: userId }] = await sql<{ id: string }>("select id from users");
  for (const [question, system] of [
    ["write-sum", "s2"],
    ["write-hello", "s1"],
    ["fix-sum", "s2"],
  ]) {
    for (const correct of [false, false, true]) {
      await sql("insert into attempts (user_id, concept_id, question_id, system, correct, answer, ms) values ($1, 's0.printing', $2, $3, $4, '\"x\"', $5)", [
        userId,
        question,
        system,
        correct,
        system === "s1" ? 20_000 : null,
      ]);
    }
  }
  const before = await sql<{ prompt: string }>("select question->>'prompt' as prompt from review_questions");

  await page.goto("/learn");
  await expect(page.getByRole("heading", { level: 1, name: "Printing" })).toBeVisible();
  await expect(page.getByText("4 of 5 questions solved")).toBeVisible();
  const consolidation = page.getByRole("region", { name: "Consolidation", exact: true });
  const extra = (n: number) => page.getByRole("region", { name: `Consolidation question ${n}`, exact: true });
  await expect(consolidation).toHaveCount(0);

  const last = page.getByRole("region", { name: "Question 1", exact: true });
  await last.getByRole("textbox").fill("7\na + 5");
  await last.getByRole("button", { name: "Check" }).click();
  await expect(last).toContainText("Solved");

  // Every question is solved, but the lesson is not finished: its consolidation set arrives instead.
  await expect(page.getByText("5 of 5 questions solved")).toBeVisible();
  await expect(page.getByText("Lesson complete.")).toHaveCount(0);
  await expect(page.getByText("Every question is solved, but not securely yet.")).toBeVisible();
  await expect(consolidation).toBeVisible({ timeout: 30_000 });
  await expect(consolidation.getByRole("region")).toHaveCount(3);
  await expect(extra(1)).toContainText("Consolidation 1 · New question · One try · Timed, 1 min");
  expect((await sql("select 1 from lesson_progress where concept_id = 's0.printing' and completed_at is not null")).length).toBe(0);
  // The recall set is untouched: still its own three.
  await expect(spaced(page).getByRole("region")).toHaveCount(3);

  // The questions are on this lesson, and none has been seen before, in recall or anywhere else.
  const set = await sql<{ concept_id: string; prompt: string }>("select concept_id, question->>'prompt' as prompt from review_questions where purpose = 'consolidation' order by id");
  expect(set.map((row) => row.concept_id)).toEqual(["s0.printing", "s0.printing", "s0.printing"]);
  expect(new Set(set.map((row) => row.prompt)).size).toBe(3);
  for (const row of set) expect(before.map((old) => old.prompt)).not.toContain(row.prompt);

  const reply = async (n: number, right: boolean) => {
    await extra(n).getByRole("button", { name: "Start" }).click();
    const count = Number((await extra(n).locator(".q-prompt").innerText()).match(/has (\d+) sheep/)![1]);
    await extra(n).getByRole("textbox").fill(String(right ? count + 10 : 1));
    await extra(n).getByRole("button", { name: "Check" }).click();
    await expect(extra(n)).toContainText(right ? "Right" : "Missed");
  };
  await reply(1, true);
  await reply(2, false);
  await expect(page.getByText("Lesson complete.")).toHaveCount(0);
  await reply(3, false);

  // The last answer finishes the lesson, and its mastery is shown: well short of full after such a finish.
  await expect(page.getByText("Lesson complete.")).toBeVisible();
  const shown = await page.locator(".lesson-end-mastery").innerText();
  const percent = Number(shown.match(/Mastery (\d+)%/)![1]);
  expect(percent).toBeGreaterThan(0);
  expect(percent).toBeLessThan(70);
  await consolidation.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/screens/consolidation-laptop.png" });

  expect((await sql("select 1 from lesson_progress where concept_id = 's0.printing' and completed_at is not null")).length).toBe(1);
  // Most of the set was missed, so the lesson's first recall comes in about a day, not about four.
  const [state] = await sql<{ days: number }>("select extract(epoch from due_at - now()) / 86400 as days from review_states where concept_id = 's0.printing'");
  expect(Number(state.days)).toBeLessThan(2);

  // The Map shows mastery beside each finished lesson.
  await page.goto("/map");
  await expect(page.locator(".map-body li").filter({ hasText: "Printing" })).toContainText(/Mastery \d+%/);
});

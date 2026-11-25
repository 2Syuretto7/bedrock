import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/*
 * The gallery shows every figure placed in the real course content, not the test fixtures,
 * so this checks each one a learner will meet, at laptop, tablet and phone sizes.
 */

test("every figure in the course draws, reads out its state and fits the screen", async ({ page }) => {
  await page.goto("/gallery");
  await expect(page.getByRole("heading", { level: 1, name: "Every figure in the course" })).toBeVisible();
  const items = page.locator(".gallery-item");
  const count = await items.count();
  expect(count).toBeGreaterThan(0);
  await expect(page.locator(".gallery-count")).toContainText(`${count} placement`);
  for (let i = 0; i < count; i++) {
    const figure = items.nth(i).getByRole("figure");
    await expect(figure.locator("svg").first()).toBeVisible();
    await expect(figure.locator(".fig-summary")).not.toBeEmpty();
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("the logarithmic scale compares two sizes, and the even scale shows why it is needed", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="log-scale"]').first().getByRole("figure");
  await expect(figure).toContainText("A phone photograph: 30,00,000 bytes. A 1 TB laptop drive: 10,00,00,00,00,000 bytes, about 1 × 10¹².");
  await expect(figure).toContainText("The larger is 5.5 orders of magnitude above the smaller: about 3,30,000 times as much.");
  await figure.getByRole("button", { name: "Decrease second" }).click();
  await expect(figure).toContainText("The larger is 3 orders of magnitude above the smaller: about 1,000 times as much.");
  const toggle = figure.getByRole("button", { name: "Show an even scale" });
  await toggle.click();
  await expect(figure).toContainText("5 of the 6 quantities are under 1% of the largest, so they sit on top of one another at zero");
  await expect(figure.getByRole("button", { name: "Show the logarithmic scale" })).toHaveAttribute("aria-pressed", "true");
});

test("the step-through figure runs a program a line at a time, and shows a bug's two faces", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="step-through"]').filter({ hasText: "Stepping through the bill splitter" }).getByRole("figure");
  await expect(figure).toContainText("Step 1 of 9, line 1: Python binds the name who_ate to the recipe.");
  await figure.getByRole("button", { name: "Jump to the end" }).click();
  await expect(figure).toContainText("print shows 0. Nobody is listed, so dividing the bill among them would divide by zero.");
  await expect(figure.locator('[aria-current="step"]')).toContainText("print(len(people))");
  await expect(figure.locator(".fig-output")).toHaveText("0");

  await figure.getByRole("button", { name: "Put Asha first" }).click();
  await expect(figure).toContainText("Step 1 of 10");
  await figure.getByRole("button", { name: "Jump to the end" }).click();
  await expect(figure).toContainText("print shows 1. Only Asha is listed, so Asha would pay the whole bill.");

  await figure.getByRole("button", { name: "Move the return out of the loop" }).click();
  await figure.getByRole("button", { name: "Jump to the end" }).click();
  await expect(figure).toContainText("print shows 3. The bill would be split 3 ways, as it should be.");
  await figure.getByRole("button", { name: "Decrease step" }).click();
  await expect(figure).toContainText("Back in the main program, people is bound to ['Asha', 'Ravi', 'Meera'].");

  const deposit = page.locator('.gallery-item[data-figure="step-through"]').filter({ hasText: "Stepping through the fixed deposit" }).getByRole("figure");
  await deposit.getByRole("button", { name: "Jump to the end" }).click();
  await expect(deposit).toContainText("The deposit first reaches double in year 11.");
  await deposit.getByRole("button", { name: "Increase rate" }).click();
  await deposit.getByRole("button", { name: "Jump to the end" }).click();
  await expect(deposit).toContainText("The deposit first reaches double in year 10.");
});

test("the binary counter counts, wraps round, and reads the same byte two ways", async ({ page }) => {
  await page.goto("/gallery");
  const four = page.locator('.gallery-item[data-figure="binary-counter"]').filter({ hasText: "Four bits" }).getByRole("figure");
  await expect(four).toContainText("Bits 1101. Read as unsigned: 8 + 4 + 1 = 13. In hexadecimal, D.");
  await four.getByRole("button", { name: "Add 1" }).click();
  await four.getByRole("button", { name: "Add 1" }).click();
  await expect(four).toContainText("Bits 1111. Read as unsigned: 8 + 4 + 2 + 1 = 15. In hexadecimal, F.");
  await four.getByRole("button", { name: "Add 1" }).click();
  await expect(four).toContainText("Adding 1 to 1111 carried out of the leftmost bit. There is no bit there to hold the carry, so it is lost and the row wraps round to 0000.");
  await four.getByRole("button", { name: "Flip the 4s bit" }).click();
  await expect(four).toContainText("Bits 0100. Read as unsigned: the only 1 is in the 4 column, so the value is 4. In hexadecimal, 4.");

  const signed = page.locator('.gallery-item[data-figure="binary-counter"]').filter({ hasText: "Two's complement and overflow" }).getByRole("figure");
  await expect(signed).toContainText("Bits 0111 1111. Read as two's complement: 64 + 32 + 16 + 8 + 4 + 2 + 1 = 127. In hexadecimal, 7F.");
  await signed.getByRole("button", { name: "Add 1" }).click();
  await expect(signed).toContainText("Bits 1000 0000. Read as two's complement: the only 1 is in the −128 column, so the value is −128. In hexadecimal, 80.");
  await signed.getByRole("button", { name: "Read as unsigned" }).click();
  await expect(signed).toContainText("Read as unsigned: the only 1 is in the 128 column, so the value is 128.");
  await expect(signed.getByRole("button", { name: "Read as two's complement" })).toHaveAttribute("aria-pressed", "false");
});

test("the struct-padding figure shows where a record's padding goes, and how reordering or packing removes it", async ({ page }) => {
  await page.goto("/gallery");
  const pair = page.locator('.gallery-item[data-figure="struct-padding"]').filter({ hasText: "A char and an int" }).getByRole("figure");
  await expect(pair).toContainText("kind at byte 0, 1 byte. 3 bytes of padding. balance at byte 4, 4 bytes. Size 8 bytes: 5 of data and 3 of padding.");
  await pair.getByRole("button", { name: "Put the largest fields first" }).click();
  await expect(pair).toContainText("balance at byte 0, 4 bytes. kind at byte 4, 1 byte. 3 bytes of padding at the end, so that the next record in an array starts aligned too. Size 8 bytes");

  const tap = page.locator('.gallery-item[data-figure="struct-padding"]').filter({ hasText: "A metro tap record" }).getByRole("figure");
  await expect(tap).toContainText("kind at byte 0, 1 byte. 7 bytes of padding. when at byte 8, 8 bytes. station at byte 16, 2 bytes. 2 bytes of padding. fare at byte 20, 4 bytes. Size 24 bytes: 15 of data and 9 of padding.");
  await tap.getByRole("button", { name: "Put the largest fields first" }).click();
  await expect(tap).toContainText("Fields in the order when, fare, station, kind");
  await expect(tap).toContainText("Size 16 bytes: 15 of data and 1 of padding.");
  await tap.getByRole("button", { name: "Back to the original order" }).click();
  await tap.getByRole("button", { name: "Pack the fields with no gaps" }).click();
  await expect(tap).toContainText("when at byte 1, 8 bytes. station at byte 9, 2 bytes. fare at byte 11, 4 bytes. Size 15 bytes: 15 of data and 0 of padding. when crosses from one 8-byte row into the next, so reading it takes two reads of memory.");
  await expect(tap.getByRole("button", { name: "Align the fields" })).toHaveAttribute("aria-pressed", "true");
});

test("the staircase figure adds 1 to n as half of a rectangle", async ({ page }) => {
  await page.goto("/gallery");
  const figure = page.locator('.gallery-item[data-figure="triangle-sum"]').first().getByRole("figure");
  await expect(figure).toContainText("1 + 2 + … + 4 is the staircase of shaded squares, row k holding k of them: 10 in all.");
  await expect(figure.locator("rect")).toHaveCount(20);
  await figure.getByRole("button", { name: "Increase n" }).click();
  await expect(figure).toContainText("completes a rectangle 5 by 6 with 30 squares. So the staircase is half of it: 5 × 6 ÷ 2 = 15.");
  await expect(figure.locator("rect")).toHaveCount(30);
  await expect(figure.locator("rect.fig-accent")).toHaveCount(15);
});

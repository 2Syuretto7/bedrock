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

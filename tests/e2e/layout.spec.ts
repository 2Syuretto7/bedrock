import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { expectIconsServed } from "./icons";

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

for (const theme of ["dark", "light"] as const) {
  test(`home fits the screen and is accessible (${theme})`, async ({ page }, info) => {
    await page.addInitScript((t) => localStorage.setItem("bedrock-theme", t), theme);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    const learn = page.getByRole("link", { name: /Learn/ });
    await expect(learn).toBeVisible();
    await expect(learn).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole("heading", { level: 1, name: "Derive it. Build it. Break it." })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(theme === "dark");

    // The specification allows at most 2 px of radius on controls.
    const radius = await learn.evaluate((el) => parseFloat(getComputedStyle(el).borderTopLeftRadius));
    expect(radius).toBeLessThanOrEqual(2);
    // Touch targets are at least 40 px tall.
    expect((await learn.boundingBox())!.height).toBeGreaterThanOrEqual(40);

    await expectNoHorizontalScroll(page);
    await expectAccessible(page);
    await page.screenshot({ path: `test-results/screens/home-${info.project.name}-${theme}.png` });
  });
}

test("the headline reveal runs when motion is welcome and ends fully visible", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const lastChar = page.locator("h1 .char").last();
  await expect(lastChar).toHaveCSS("opacity", "1", { timeout: 5000 });
});

test("the theme switch works and is remembered", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Light theme" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await expect(page.getByRole("button", { name: "Dark theme" })).toBeVisible();
});

test("the icons and the manifest are served without a session", async ({ browser }) => {
  const context = await browser.newContext();
  await expectIconsServed(await context.newPage(), context.request);
  await context.close();
});

test("sign-in fits the screen and is accessible", async ({ browser }, info) => {
  const context = await browser.newContext({ viewport: info.project.use.viewport, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/sign-in");
  await expect(page.getByLabel("Six words")).toBeVisible();
  await expectNoHorizontalScroll(page);
  await expectAccessible(page);
  await page.screenshot({ path: `test-results/screens/sign-in-${info.project.name}.png` });
  await context.close();
});

test("every screen can be reached and used with the keyboard", async ({ page }) => {
  await page.goto("/");
  const order: string[] = [];
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press("Tab");
    order.push(await page.evaluate(() => document.activeElement?.textContent?.trim() ?? ""));
  }
  expect(order).toEqual(["BEDROCK", "Map", "Light theme", "Learn›"]);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/learn$/);
});

test("the wordmark, map link and theme switch sit on one line", async ({ page }) => {
  await page.goto("/");
  const centres = [];
  for (const item of [
    page.getByRole("link", { name: "Bedrock home" }),
    page.getByRole("link", { name: "Map", exact: true }),
    page.getByRole("button", { name: /theme$/ }),
  ]) {
    // Measure the text itself, not the element around it.
    centres.push(
      await item.evaluate((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        const box = range.getBoundingClientRect();
        return box.top + box.height / 2;
      }),
    );
  }
  expect(Math.max(...centres) - Math.min(...centres)).toBeLessThanOrEqual(0.5);
});

test("the workspace top bar sits on one line", async ({ page }, info) => {
  await page.goto("/learn");
  // Nothing in the bar wraps, and the save status only appears where there is room for it.
  const theme = page.getByRole("button", { name: /theme$/ });
  const textHeight = await theme.evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    return range.getBoundingClientRect().height;
  });
  expect(textHeight).toBeLessThanOrEqual(20); // one line of 16 px text
  if (info.project.name === "phone") await expect(page.getByRole("status").filter({ hasText: /^Sav/ })).toBeHidden();
  const centres = [];
  const items = [
    page.getByRole("link", { name: "Bedrock home" }),
    page.getByRole("link", { name: "Map", exact: true }),
    page.getByRole("button", { name: /theme$/ }),
  ];
  if (info.project.name !== "phone") items.push(page.getByRole("status").filter({ hasText: /^Sav/ }));
  for (const item of items) {
    await expect(item).toBeVisible();
    await expect(item).toBeInViewport({ ratio: 1 });
    centres.push(
      await item.evaluate((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        const box = range.getBoundingClientRect();
        return box.top + box.height / 2;
      }),
    );
  }
  expect(Math.max(...centres) - Math.min(...centres)).toBeLessThanOrEqual(0.5);
});

for (const theme of ["dark", "light"] as const) {
  test(`the map shows where the learner is, the route Learn follows, and what is still to be written (${theme})`, async ({ page }, info) => {
    await page.addInitScript((t) => localStorage.setItem("bedrock-theme", t), theme);
    await page.goto("/");
    await page.getByRole("link", { name: "Map", exact: true }).click();
    await expect(page).toHaveURL(/\/map$/);
    await expect(page.getByRole("heading", { level: 1, name: "Where you are, and what it leads to" })).toBeVisible();
    await expect(page.locator(".map-now")).toContainText("Next in LearnCountingCounting");
    await expect(page.getByText("0 of 3 lessons done · 0 of 1 mini-capstones · 1 more planned")).toBeVisible();

    // The route is the order Learn takes, and the cluster the learner is in is open to begin with.
    const stages = page.getByRole("region", { name: "Your route" }).locator(".map-stage");
    await expect(stages.locator("summary")).toHaveText(["CountingFoundations · 2 lessons", "First programsSoftware engineering · 1 lesson"]);
    await expect(stages.first()).toHaveAttribute("aria-current", "step");
    await expect(stages.first().locator(".map-body li")).toHaveText(["CountingNow", "Adding"]);

    // Any other written cluster opens with one tap.
    const later = stages.nth(1);
    await expect(later.locator(".map-body")).toBeHidden();
    await later.locator("summary").click();
    await expect(later.locator(".map-body")).toContainText("Builds on Counting.");
    await expect(later.locator(".map-body li")).toHaveText(["Printing", "Mini-capstone: A sum, shown"]);
    expect((await later.locator("summary").boundingBox())!.height).toBeGreaterThanOrEqual(40);

    // What is not written yet is named, by track, and nothing more.
    const ahead = page.getByRole("region", { name: "Further on, not written yet" });
    await expect(ahead.getByRole("heading", { level: 3 })).toHaveText(["Distributed systems and cloud"]);
    await expect(ahead.getByRole("listitem")).toHaveText(["Not written yet1 lesson"]);

    await expectNoHorizontalScroll(page);
    await expectAccessible(page);
    await page.screenshot({ path: `test-results/screens/map-${info.project.name}-${theme}.png`, fullPage: true });
    await page.getByRole("link", { name: /Learn/ }).click();
    await expect(page).toHaveURL(/\/learn$/);
  });
}

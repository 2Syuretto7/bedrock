import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const FIRST_RUN = 90_000; // The first run also downloads and starts Python.
// A test must outlive its slowest wait, or the 30 s default cuts the first run short.
test.describe.configure({ timeout: FIRST_RUN + 30_000 });

async function openCode(page: Page, project: string) {
  if (project === "phone") await page.getByRole("button", { name: "Code", exact: true }).click();
}

async function withCode(page: Page, code: string) {
  await page.addInitScript((value) => localStorage.setItem("bedrock-code:f0.counting", value), code);
  await page.goto("/learn");
}

test("panes are arranged for this screen size", async ({ page }, info) => {
  await page.goto("/learn");
  const lesson = page.getByRole("region", { name: "Lesson" });
  const code = page.getByRole("region", { name: "Code" });
  const tabs = page.getByRole("navigation", { name: "Panes" });

  if (info.project.name === "laptop") {
    const [a, b] = [(await lesson.boundingBox())!, (await code.boundingBox())!];
    expect(a.x + a.width).toBeLessThanOrEqual(b.x); // side by side
    expect(Math.abs(a.width - b.width)).toBeLessThan(4);
    await expect(tabs).toBeHidden();
  } else if (info.project.name === "tablet") {
    const [a, b] = [(await lesson.boundingBox())!, (await code.boundingBox())!];
    expect(a.y + a.height).toBeLessThanOrEqual(b.y); // portrait: stacked
    await expect(tabs).toBeHidden();
  } else {
    await expect(lesson).toBeVisible();
    await expect(code).toBeHidden();
    await page.getByRole("button", { name: "Code", exact: true }).click();
    await expect(code).toBeVisible();
    await expect(lesson).toBeHidden();
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.screenshot({ path: `test-results/screens/workspace-${info.project.name}.png` });
});

test("the workspace fills exactly one screen and only the panes scroll", async ({ page }) => {
  await page.goto("/learn");
  const scroller = page.locator(".ws-scroll");
  await expect(scroller.getByRole("heading", { level: 1 })).toBeVisible();

  // The page itself has nothing to scroll, however long the lesson is.
  const pageSize = await page.evaluate(() => {
    window.scrollTo(0, 5000);
    const root = document.documentElement;
    return {
      extra: root.scrollHeight - window.innerHeight,
      scrolled: window.scrollY,
      bottom: document.querySelector(".ws")!.getBoundingClientRect().bottom - window.innerHeight,
    };
  });
  expect(pageSize).toEqual({ extra: 0, scrolled: 0, bottom: 0 });

  // Nothing inside the lesson escapes its pane (screen-reader text once did, and stretched the page).
  const escaped = await scroller.evaluate((el) =>
    [...el.querySelectorAll("*")].filter((child) => !el.contains((child as HTMLElement).offsetParent ?? el)).length,
  );
  expect(escaped).toBe(0);

  // The whole lesson is there, and the pane scrolls down to its last part.
  const parts = scroller.locator("section.lesson-part");
  expect(await parts.count()).toBe(8);
  await expect(parts.last()).not.toBeInViewport();
  await parts.last().scrollIntoViewIfNeeded();
  await expect(parts.last()).toBeInViewport();
  expect(await scroller.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page.getByRole("link", { name: "Bedrock home" })).toBeInViewport({ ratio: 1 });
});

test("pane scrollbars are thin, square and without arrows", async ({ page }) => {
  await page.goto("/learn");
  for (const pane of [".ws-scroll", ".ws-output"]) {
    const bar = await page.locator(pane).evaluate((el) => ({
      width: getComputedStyle(el, "::-webkit-scrollbar").width,
      arrows: getComputedStyle(el, "::-webkit-scrollbar-button").display,
      thumb: getComputedStyle(el, "::-webkit-scrollbar-thumb").backgroundColor,
      radius: getComputedStyle(el, "::-webkit-scrollbar-thumb").borderTopLeftRadius,
    }));
    expect(bar.width).toBe("10px");
    expect(bar.arrows).toBe("none");
    expect(bar.thumb).toBe("rgb(77, 77, 77)"); // the dark theme's input border grey
    expect(bar.radius).toBe("0px");
  }
});

test("tablet in landscape puts the panes side by side", async ({ page }, info) => {
  test.skip(info.project.name !== "tablet");
  await page.setViewportSize({ width: 1180, height: 820 });
  await page.goto("/learn");
  const a = (await page.getByRole("region", { name: "Lesson" }).boundingBox())!;
  const b = (await page.getByRole("region", { name: "Code" }).boundingBox())!;
  expect(a.x + a.width).toBeLessThanOrEqual(b.x);
});

test("Python runs in the browser and prints its output", async ({ page }, info) => {
  await withCode(page, "total = 0\nfor n in range(1, 11):\n    total = total + n\nprint('1 + 2 + ... + 10 =', total)\n");
  await openCode(page, info.project.name);
  await page.getByRole("button", { name: /^Run/ }).click();
  await expect(page.getByTestId("output")).toContainText("1 + 2 + ... + 10 = 55", { timeout: FIRST_RUN });
  await page.screenshot({ path: `test-results/screens/workspace-run-${info.project.name}.png` });
});

test("NumPy is loaded the first time code asks for it", async ({ page }, info) => {
  await withCode(page, "import numpy as np\n\nA = np.array([[2, 1], [1, 2]])\nprint(A @ np.array([1, 1]), A.shape)\n");
  await openCode(page, info.project.name);
  await page.getByRole("button", { name: /^Run/ }).click();
  await expect(page.getByTestId("output")).toContainText("[3 3] (2, 2)", { timeout: FIRST_RUN });
});

test("errors are shown as Python reports them, about the learner's own line", async ({ page }, info) => {
  await withCode(page, "x = 10\nprint(x / 0)\n");
  await openCode(page, info.project.name);
  await page.getByRole("button", { name: /^Run/ }).click();
  const output = page.getByTestId("output");
  await expect(output).toContainText("ZeroDivisionError", { timeout: FIRST_RUN });
  await expect(output).toContainText("line 2");
  await expect(output).not.toContainText("_pyodide");
});

test("a loop that never ends can be stopped, and Python recovers", async ({ page }, info) => {
  await withCode(page, "while True:\n    pass\n");
  await openCode(page, info.project.name);
  await page.getByRole("button", { name: /^Run/ }).click();
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await expect(page.getByTestId("output")).toContainText("Stopped.");
  // The worker was replaced; a new run must still work.
  await page.locator(".cm-content").click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type("print(6 * 7)");
  await page.keyboard.press("ControlOrMeta+Enter");
  await expect(page.getByTestId("output")).toContainText("42", { timeout: FIRST_RUN });
});

test("code is saved as it is typed and survives a reload", async ({ page }, info) => {
  await page.goto("/learn");
  await openCode(page, info.project.name);
  await page.locator(".cm-content").click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type("print('kept')");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("bedrock-code:f0.counting"))).toBe("print('kept')");
  await page.reload();
  await openCode(page, info.project.name);
  await expect(page.locator(".cm-content")).toContainText("print('kept')");
});

test("touch screens get a symbol bar that types into the editor", async ({ page }, info) => {
  test.skip(info.project.name === "laptop");
  await withCode(page, "");
  await openCode(page, info.project.name);
  const bar = page.getByRole("toolbar", { name: "Code symbols" });
  await expect(bar).toBeVisible();
  await page.locator(".cm-content").click();
  await page.keyboard.type("print");
  for (const symbol of ["(", "[", "]", ")"]) await bar.getByRole("button", { name: symbol, exact: true }).click();
  await expect(page.locator(".cm-content")).toContainText("print([])");
  const key = (await bar.getByRole("button", { name: "(", exact: true }).boundingBox())!;
  expect(key.height).toBeGreaterThanOrEqual(40);
});

test("the workspace is accessible", async ({ page }, info) => {
  await page.goto("/learn");
  await openCode(page, info.project.name);
  // CodeMirror's scroller wraps an editable text box that is itself focusable
  // and scrolls with the cursor, which the automated rule cannot see.
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .exclude(".cm-scroller")
    .analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes[0]?.target})`)).toEqual([]);
});

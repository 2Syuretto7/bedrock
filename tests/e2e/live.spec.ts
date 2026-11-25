import { expect, test } from "@playwright/test";

/**
 * Runs against a deployed site: production, and the preview of every pull request. Read-only: it never signs up or
 * signs in, so it cannot touch the learner's data.
 */
test("the site is healthy, connected to its database, and the tutor has its key", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ ok: true, tutor: true });
});

test("the tutor does not answer anyone who is signed out", async ({ request }) => {
  const response = await request.post("/api/tutor", { data: { conceptId: "scratch", message: "Hello" }, maxRedirects: 0 });
  expect(response.status()).toBeGreaterThanOrEqual(300);
  expect(response.status()).toBeLessThan(500);
});

test("visitors without a session are sent to sign-in", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("security headers are present", async ({ request }) => {
  const headers = (await request.get("/sign-in")).headers();
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["strict-transport-security"]).toContain("max-age");
});

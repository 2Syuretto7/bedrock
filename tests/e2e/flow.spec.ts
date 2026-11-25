import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

let passphrase = "";

test("a first visit is sent to sign-in and can create the passphrase", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { name: "Create your passphrase." })).toBeVisible();

  await page.getByRole("button", { name: "Generate passphrase" }).click();
  await expect(page.getByRole("heading", { name: "This is your passphrase." })).toBeVisible();
  passphrase = (await page.getByTestId("passphrase").innerText()).trim();
  expect(passphrase.split(" ")).toHaveLength(6);

  await page.getByRole("link", { name: /I have saved it/ }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("link", { name: /Learn/ })).toBeVisible();
});

test("the session cookie is HttpOnly, Secure and SameSite=Lax", async ({ page, context }) => {
  await page.goto("/sign-in");
  const cookie = (await context.cookies()).find((c) => c.name.endsWith("bedrock_session"));
  // Each test has a fresh context, so sign in to get a cookie to inspect.
  expect(cookie).toBeUndefined();
  await page.getByLabel("Six words").fill(passphrase);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);
  const session = (await context.cookies()).find((c) => c.name === "__Host-bedrock_session");
  expect(session).toMatchObject({ httpOnly: true, secure: true, sameSite: "Lax", path: "/" });
  expect(await page.evaluate(() => document.cookie)).not.toContain("bedrock_session");
});

test("Learn opens, nothing offers to sign out, and a wrong passphrase is refused", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("heading", { name: "Paste your passphrase." })).toBeVisible();

  await page.getByLabel("Six words").fill("these are not the right six words");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "did not match" })).toBeVisible();
  await expect(page).toHaveURL(/\/sign-in$/);

  // Pasted carelessly: upper case, hyphens, trailing newline.
  await page.getByLabel("Six words").fill(`${passphrase.toUpperCase().replaceAll(" ", " - ")}\n`);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.getByRole("link", { name: /Learn/ }).click();
  await expect(page).toHaveURL(/\/learn$/);
  await expect(page.getByRole("heading", { level: 1, name: "Counting" })).toBeVisible();
  await page.getByRole("link", { name: "Bedrock home" }).click();
  await expect(page).toHaveURL(/\/$/);

  await expect(page.getByRole("button", { name: "Sign out" })).toHaveCount(0);
});

test("a second account cannot be created", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("button", { name: "Generate passphrase" })).toHaveCount(0);
});

test("keep a signed-in session for the layout checks", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Six words").fill(passphrase);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.context().storageState({ path: "test-results/.auth/learner.json" });
});

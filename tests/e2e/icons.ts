import { readFileSync } from "node:fs";
import { expect, type APIRequestContext, type Page } from "@playwright/test";

/**
 * Checks, for a visitor with no session, that every icon the page links and every icon in the manifest loads
 * instead of being sent to sign-in, and that the vector icon served is the one in the repository.
 */
export async function expectIconsServed(page: Page, request: APIRequestContext) {
  await page.goto("/sign-in");
  const links = await page
    .locator('head link[rel="icon"], head link[rel="apple-touch-icon"], head link[rel="manifest"]')
    .evaluateAll((els) => els.map((el) => ({ rel: el.getAttribute("rel") ?? "", href: el.getAttribute("href") ?? "", type: el.getAttribute("type") ?? "" })));
  expect(links.map((link) => link.rel).sort()).toEqual(["apple-touch-icon", "icon", "icon", "manifest"]);
  for (const link of links) expect((await request.get(link.href, { maxRedirects: 0 })).status(), link.href).toBe(200);

  const vector = links.find((link) => link.type === "image/svg+xml");
  expect(vector, "a vector icon is linked").toBeDefined();
  expect(await (await request.get(vector!.href)).text()).toBe(readFileSync("src/app/icon.svg", "utf8"));

  const manifest = await (await request.get(links.find((link) => link.rel === "manifest")!.href)).json();
  expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toEqual(["192x192", "512x512"]);
  for (const icon of manifest.icons as { src: string }[]) {
    const response = await request.get(icon.src, { maxRedirects: 0 });
    expect(response.status(), icon.src).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/png");
  }
}

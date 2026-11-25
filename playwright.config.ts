import path from "node:path";
import { defineConfig } from "@playwright/test";

/**
 * Two modes.
 * Local and CI: builds the app, runs it against a throwaway Postgres database
 * and exercises the full flows at laptop, tablet and phone sizes.
 * Live (LIVE_URL set): read-only smoke check of the deployed production site.
 * See tests/e2e/live.spec.ts. No secrets are involved in either mode.
 */
const previewUrl = process.env.LIVE_URL;
const port = 3100;
const mockPort = 3199;
const e2eDatabase = process.env.E2E_DATABASE_URL ?? "postgres://bedrock:bedrock@localhost:5432/bedrock_e2e";

const sizes = {
  laptop: { width: 1440, height: 900 },
  tablet: { width: 820, height: 1180 },
  phone: { width: 390, height: 844 },
} as const;

export default defineConfig({
  testDir: "tests/e2e",
  outputDir: "test-results",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: previewUrl ?? `http://localhost:${port}`,
    trace: "off",
  },
  projects: previewUrl
    ? Object.entries(sizes).map(([name, viewport]) => ({
        name: `live-${name}`,
        testMatch: /live\.spec\.ts/,
        use: { viewport, hasTouch: name !== "laptop" },
      }))
    : [
        { name: "flow", testMatch: /flow\.spec\.ts/, use: { viewport: sizes.laptop } },
        ...Object.entries(sizes).map(([name, viewport]) => ({
          name,
          testMatch: /(layout|workspace|tutor)\.spec\.ts/,
          dependencies: ["flow"],
          use: { viewport, hasTouch: name !== "laptop", storageState: "test-results/.auth/learner.json" },
        })),
        // Works through the fixture lessons once, changing screen size as it goes.
        {
          name: "lessons",
          testMatch: /lessons\.spec\.ts/,
          dependencies: ["laptop", "tablet", "phone"],
          use: { viewport: sizes.laptop, storageState: "test-results/.auth/learner.json" },
        },
        // Reopens the last fixture lesson as if weeks had passed, so earlier ideas are due in its Recall part.
        {
          name: "review",
          testMatch: /review\.spec\.ts/,
          dependencies: ["lessons"],
          use: { viewport: sizes.laptop, storageState: "test-results/.auth/learner.json" },
        },
      ],
  webServer: previewUrl
    ? undefined
    : [
        // The tutor talks to this stand-in instead of the real Anthropic API: no key, no cost.
        {
          command: "node tests/e2e/mock-anthropic.mjs",
          url: `http://localhost:${mockPort}/`,
          reuseExistingServer: false,
          env: { MOCK_ANTHROPIC_PORT: String(mockPort) },
        },
        {
          command: `npm run build && npm run start -- --port ${port}`,
          url: `http://localhost:${port}/api/health`,
          timeout: 240_000,
          reuseExistingServer: false,
          env: {
            DATABASE_URL: e2eDatabase,
            // A three-lesson curriculum, so tests do not depend on what has been written so far.
            BEDROCK_CONTENT_DIR: path.resolve("tests", "fixtures"),
            ANTHROPIC_API_KEY: "not-a-real-key",
            ANTHROPIC_BASE_URL: `http://localhost:${mockPort}`,
          },
        },
      ],
  globalSetup: previewUrl ? undefined : "./tests/e2e/global-setup.ts",
});

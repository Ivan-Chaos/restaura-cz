import { defineConfig, devices } from "@playwright/test";

/**
 * Storybook smoke suite.
 *
 * Separate from `playwright.config.ts` because the two need different servers,
 * and building Storybook on every run of the (much more frequently run) menu
 * e2e suite would be wasted minutes.
 *
 * What it guards: that the documentation site actually builds and that its
 * theme/appearance toolbars really change the rendered page — the claim
 * FR-022 makes. A story passing in Vitest does not prove the published
 * Storybook works.
 */
export default defineConfig({
  testDir: "./tests/e2e-storybook",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "html" : "list",

  use: {
    baseURL: "http://localhost:6006",
    trace: "on-first-retry",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: {
    command: "pnpm build-storybook && node scripts/serve-static.mjs storybook-static 6006",
    url: "http://localhost:6006/index.html",
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});

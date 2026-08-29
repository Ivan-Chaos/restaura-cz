import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end verification against a **production build**.
 *
 * Storybook proves components in isolation; this proves the real page — real
 * routing, real fonts, real static rendering — which is the only place the
 * responsiveness, locale and performance claims in the spec can be measured.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "html" : "list",

  expect: {
    toHaveScreenshot: {
      // Animations are disabled so a screenshot never races a transition.
      animations: "disabled",
      caret: "hide",
      // Font rasterisation differs slightly between machines; this tolerates
      // that without hiding a real layout or colour regression.
      maxDiffPixelRatio: 0.01,
    },
  },

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "pnpm build && pnpm start",
    url: "http://localhost:3000/cs",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});

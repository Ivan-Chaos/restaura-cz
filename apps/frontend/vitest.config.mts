import { fileURLToPath } from "node:url";

import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";
import type { BrowserConfigOptions } from "vitest/node";

const alias = { "@": fileURLToPath(new URL("./", import.meta.url)) };

/**
 * Vitest 4 takes a provider object, not the v3 `provider: "playwright"` string.
 * The same Playwright that drives the end-to-end suite therefore also renders
 * the component tests — one browser engine, one set of behaviours to reason
 * about.
 */
const browserFor = (name: string): BrowserConfigOptions => ({
  enabled: true,
  headless: true,
  provider: playwright(),
  // The instance name must be unique across projects: Vitest derives the
  // sub-project id from it, and both passes use the same browser.
  instances: [{ browser: "chromium", name }],
});

/**
 * Two kinds of test live here.
 *
 * `unit`   — pure logic in `lib/design-system` plus the theme contract checks
 *            that parse the CSS themselves (contrast, required tokens).
 *
 * `storybook` — every story, executed in a real browser. Stories *are* the
 *            component tests: their `play` functions assert behaviour and the
 *            a11y addon fails on violations.
 *
 * The Storybook suite runs twice under deliberately different globals. The
 * second pass (`storybook-alt`: slate / dark / German) is the adversarial one —
 * opposite theme, opposite appearance, longest strings. A component that
 * hard-codes a colour or assumes English string lengths passes the first pass
 * and fails the second. See `.storybook/vitest.setup.ts`.
 */
export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
        },
      },
      {
        extends: true,
        plugins: [storybookTest({ configDir: ".storybook" })],
        resolve: { alias },
        test: {
          name: "storybook",
          browser: browserFor("storybook-chromium"),
          setupFiles: [".storybook/vitest.setup.ts"],
        },
      },
      {
        extends: true,
        plugins: [storybookTest({ configDir: ".storybook" })],
        resolve: { alias },
        test: {
          name: "storybook-alt",
          env: { SB_TEST_VARIANT: "slate-dark-de" },
          browser: browserFor("storybook-alt-chromium"),
          setupFiles: [".storybook/vitest.setup.ts"],
        },
      },
    ],
  },
});

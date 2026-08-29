import { setProjectAnnotations } from "@storybook/nextjs-vite";
import { beforeAll } from "vitest";

import * as previewAnnotations from "./preview";

/**
 * Runs every story through the same decorators, globals and parameters the
 * Storybook UI uses, so a story that passes in the browser passes in CI for the
 * same reasons — including the locale provider and the theme/appearance
 * attributes.
 *
 * `SB_TEST_VARIANT` lets `vitest.config.mts` run the whole suite a second time
 * under the opposite theme, opposite appearance and the longest locale. See the
 * comment there for why that second pass earns its runtime.
 */
const VARIANTS: Record<string, Record<string, string>> = {
  "slate-dark-de": { theme: "slate", appearance: "dark", locale: "de" },
};

/**
 * This file runs inside the **browser**, so `process.env` is not the node
 * process's environment. Vitest surfaces `test.env` values on `import.meta.env`
 * for browser projects; the `process.env` fallback keeps it working if this ever
 * runs in a node project too.
 *
 * Getting this wrong fails silently — the second pass would run with the same
 * globals as the first and quietly halve the coverage — which is why
 * `ThemeScope.stories.tsx` asserts the applied combination.
 */
const variant =
  (import.meta.env?.SB_TEST_VARIANT as string | undefined) ??
  (typeof process !== "undefined" ? process.env?.SB_TEST_VARIANT : undefined);

const overrides = variant ? VARIANTS[variant] : undefined;

if (variant && !overrides) {
  throw new Error(
    `Unknown SB_TEST_VARIANT "${variant}". Known: ${Object.keys(VARIANTS).join(", ")}`,
  );
}

const project = setProjectAnnotations(
  overrides
    ? [previewAnnotations, { initialGlobals: overrides }]
    : [previewAnnotations],
);

beforeAll(project.beforeAll);

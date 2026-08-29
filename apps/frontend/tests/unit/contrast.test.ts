import { describe, expect, it } from "vitest";

import { formatFailures, formatMatrix, measurePairs } from "@/lib/design-system/contrast";
import { APPEARANCES, CONTRAST_PAIRS } from "@/lib/design-system/tokens";

import { ALL_THEMES, varsFor } from "./theme-css";

/**
 * The accessibility contract for themes (spec FR-005, FR-010, SC-002).
 *
 * This is the test that makes "themes are accessible" a property of the system
 * rather than a promise. A new theme cannot be merged without satisfying it,
 * and the failure message tells the author exactly which pair and by how much.
 */
describe("theme contrast", () => {
  for (const theme of ALL_THEMES) {
    for (const appearance of APPEARANCES) {
      it(`${theme.id} / ${appearance} meets WCAG AA on every contract pair`, () => {
        const results = measurePairs(varsFor(theme, appearance), CONTRAST_PAIRS);
        const failures = results.filter((r) => !r.passes);

        expect(
          failures,
          failures.length
            ? `\n${theme.id} / ${appearance} — ${failures.length} failing pair(s):\n` +
                `${formatFailures(results)}\n\nFull matrix:\n${formatMatrix(results)}\n`
            : "",
        ).toEqual([]);
      });
    }
  }
});

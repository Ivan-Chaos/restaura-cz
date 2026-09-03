import { parse, wcagContrast } from "culori";
import { describe, expect, it } from "vitest";

import {
  alphaOf,
  composite,
  paletteRefs,
  resolveToken,
  resolveVar,
} from "@/lib/design-system/contrast";
import { APPEARANCES, type ColorToken } from "@/lib/design-system/tokens";

import { ALL_THEMES, varsFor } from "./theme-css";

/**
 * Contrast on translucent panels (spec 005 FR-011, FR-014, SC-002).
 *
 * `contrast.test.ts` measures opaque tokens. A frosted `--panel` is different:
 * what the guest reads is the panel *composited over whatever is behind it* —
 * the page background, or any stop of the ambient gradient. This test walks
 * every theme, finds the ones whose panel carries alpha, and measures the text
 * tokens against every composite they can produce.
 */

/** Text that lands on a panel and must stay readable there. */
const TEXT_ON_PANEL: readonly ColorToken[] = ["foreground", "muted-foreground", "price"];
const MIN = 4.5;

function ratio(fg: string, bg: string): number {
  const f = parse(fg);
  const b = parse(bg);
  if (!f || !b) throw new Error(`Cannot parse ${fg} / ${bg}`);
  return Math.round(wcagContrast(f, b) * 100) / 100;
}

describe("translucent panel contrast", () => {
  const translucent = ALL_THEMES.filter((theme) =>
    APPEARANCES.some((appearance) => {
      const vars = varsFor(theme, appearance);
      const panel = vars["--panel"];
      return panel !== undefined && panel !== "transparent" && alphaOf(resolveVar(panel, vars)) < 1;
    }),
  );

  it("actually exercises a translucent theme", () => {
    // If nobody uses a frosted panel any more this suite is silently vacuous;
    // say so instead.
    expect(translucent.map((t) => t.id)).toContain("liquid-glass");
  });

  for (const theme of translucent) {
    for (const appearance of APPEARANCES) {
      it(`${theme.id} / ${appearance}: text reads on the panel over every backdrop`, () => {
        const vars = varsFor(theme, appearance);
        const panel = resolveVar(vars["--panel"], vars);

        // The panel can sit on the page itself or on any stop of the ambient.
        const backdrops: Record<string, string> = {
          "--background": resolveToken("background", vars),
        };
        for (const ref of paletteRefs(vars["--ambient"] ?? "")) {
          backdrops[ref] = resolveVar(`var(${ref})`, vars);
        }
        expect(Object.keys(backdrops).length, "ambient should reference palette steps").toBeGreaterThan(1);

        const failures: string[] = [];
        for (const [name, backdrop] of Object.entries(backdrops)) {
          const surface = composite(panel, backdrop);
          for (const token of TEXT_ON_PANEL) {
            const fg = resolveToken(token, vars);
            const r = ratio(fg, surface);
            if (r < MIN) {
              failures.push(`  --${token} on panel over ${name}: ${r}:1 (needs ${MIN}:1)`);
            }
          }
        }

        expect(failures, `\n${failures.join("\n")}\n`).toEqual([]);
      });
    }
  }
});

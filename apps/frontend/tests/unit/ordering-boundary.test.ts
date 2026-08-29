import { readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { ESLint } from "eslint";
import { afterAll, describe, expect, it } from "vitest";

/**
 * The ordering boundary (spec SC-012).
 *
 * The product today is menus only. Ordering components exist so a later revision
 * can extend the menu's visual language instead of inventing a second one — but
 * nothing routable may import them yet, or a guest could see an "add to order"
 * button for an order they cannot place.
 *
 * A convention would rot. The rule in `eslint.config.mjs` makes it mechanical;
 * this test makes sure the rule actually fires, so the guarantee cannot quietly
 * stop working when the ESLint config is refactored.
 */

const PROBE = join(process.cwd(), "app", "__ordering-boundary-probe.ts");

afterAll(() => {
  rmSync(PROBE, { force: true });
});

describe("ordering import boundary", () => {
  it("rejects an ordering import from app/", async () => {
    writeFileSync(
      PROBE,
      'import { QuantityStepper } from "@/components/ordering/QuantityStepper";\n' +
        "export default QuantityStepper;\n",
      "utf8",
    );

    const eslint = new ESLint({ cwd: process.cwd() });
    const [result] = await eslint.lintFiles([PROBE]);

    const restricted = result.messages.filter(
      (m) => m.ruleId === "no-restricted-imports",
    );

    expect(
      restricted.length,
      "app/** must not be able to import components/ordering/*. " +
        `Got messages: ${JSON.stringify(result.messages.map((m) => m.ruleId))}`,
    ).toBeGreaterThan(0);
    expect(restricted[0].message).toMatch(/documentation-only/i);
  });

  it("allows the same import from outside app/", async () => {
    // The boundary is about routability, not about the components being
    // untouchable: Storybook and tests import them freely.
    const eslint = new ESLint({ cwd: process.cwd() });
    const config = await eslint.calculateConfigForFile(
      join(process.cwd(), "components", "ordering", "QuantityStepper.tsx"),
    );

    expect(config.rules?.["no-restricted-imports"]).toBeUndefined();
  });

  it("keeps every ordering component tagged for the e2e leak check", () => {
    // `tests/e2e/sample-menu.spec.ts` asserts the guest menu renders zero
    // `[data-ordering]` elements. That assertion is only meaningful if the
    // components actually carry the attribute.
    const dir = join(process.cwd(), "components", "ordering");
    let files: string[];
    try {
      files = readdirSync(dir).filter(
        (f) => f.endsWith(".tsx") && !f.endsWith(".stories.tsx"),
      );
    } catch {
      // Directory not created yet — nothing to guarantee.
      return;
    }

    const untagged = files.filter(
      (file) => !readFileSync(join(dir, file), "utf8").includes("data-ordering"),
    );

    expect(
      untagged,
      `These ordering components lack a data-ordering attribute, so the e2e ` +
        `leak check cannot see them: ${untagged.join(", ")}`,
    ).toEqual([]);
  });
});

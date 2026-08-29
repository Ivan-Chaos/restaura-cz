import { describe, expect, it } from "vitest";

import cs from "@/messages/cs.json";
import de from "@/messages/de.json";
import en from "@/messages/en.json";
import { getPlan, PLANS, type PlanId } from "@/lib/landing/plans";

/**
 * The pricing catalogue is a promise to the visitor, so it is pinned here
 * rather than trusted to review. Every number in this file comes straight from
 * spec FR-007–FR-011; if a tier changes, the spec and this test change together.
 */

const CATALOGUES = { cs, en, de } as const;

/** Walks a dotted path into a message catalogue, or returns undefined. */
function lookup(
  catalogue: Record<string, unknown>,
  path: string,
): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (node, key) =>
        node && typeof node === "object"
          ? (node as Record<string, unknown>)[key]
          : undefined,
      catalogue,
    );
}

describe("plan catalogue", () => {
  it("shows Free first, then Pro, then Pro Plus", () => {
    // Order is a conversion decision, not an implementation detail: the free
    // tier has to be the first thing a hesitant owner reads.
    expect(PLANS.map((plan) => plan.id)).toEqual(["free", "pro", "proPlus"]);
  });

  it("recommends exactly one plan, and it is the free one", () => {
    const recommended = PLANS.filter((plan) => plan.recommended);
    expect(recommended.map((plan) => plan.id)).toEqual(["free"]);
  });

  it("never offers to sell a plan that does not exist yet", () => {
    for (const plan of PLANS.filter((p) => p.availability === "comingSoon")) {
      expect(plan.cta, `${plan.id} must capture interest, not payment`).toBe(
        "notify",
      );
    }
  });

  it("prices Pro at 129 CZK per month", () => {
    const pro = getPlan("pro");
    expect(pro.price).toEqual({ amount: 129, currency: "CZK" });
    expect(pro.period).toBe("month");
    expect(pro.availability).toBe("comingSoon");
  });

  it("leaves Pro Plus without a price", () => {
    const proPlus = getPlan("proPlus");
    expect(proPlus.price).toBeNull();
    expect(proPlus.period).toBeNull();
    expect(proPlus.availability).toBe("comingSoon");
  });

  it("lets the free tier put a real menu on a table", () => {
    const free = getPlan("free");
    expect(free.availability).toBe("available");
    expect(free.cta).toBe("signup");
    expect(free.features).toEqual([
      "plans.free.features.oneMenu",
      "plans.free.features.thirtyItems",
      "plans.free.features.brandedPdf",
      "plans.free.features.brandedQr",
    ]);
  });

  it("promises menu parsing and time menus on the top tier", () => {
    // The differentiators the spec calls out by name (FR-009).
    expect(getPlan("proPlus").features).toEqual(
      expect.arrayContaining([
        "plans.proPlus.features.menuParsing",
        "plans.proPlus.features.unlimitedMenus",
        "plans.proPlus.features.unlimitedSize",
        "plans.proPlus.features.timeMenus",
        "plans.proPlus.features.qrCodes",
        "plans.proPlus.features.pdfTemplates",
      ]),
    );
  });

  it("throws rather than rendering an unknown plan", () => {
    expect(() => getPlan("enterprise" as PlanId)).toThrow(/Unknown plan/);
  });
});

describe("plan copy", () => {
  for (const [locale, catalogue] of Object.entries(CATALOGUES)) {
    it(`translates every plan name and feature into ${locale}`, () => {
      for (const plan of PLANS) {
        const base = `Landing.plans.${plan.id}`;
        expect(lookup(catalogue, `${base}.name`), `${base}.name`).toEqual(
          expect.any(String),
        );
        expect(lookup(catalogue, `${base}.tagline`), `${base}.tagline`).toEqual(
          expect.any(String),
        );
        for (const feature of plan.features) {
          const key = `Landing.${feature}`;
          expect(lookup(catalogue, key), key).toEqual(expect.any(String));
        }
      }
    });
  }

  it("states the free tier's limits as the numbers the spec commits to", () => {
    // Prose can drift; these two numbers are the offer.
    expect(lookup(en, "Landing.plans.free.features.oneMenu")).toContain("1");
    expect(lookup(en, "Landing.plans.free.features.thirtyItems")).toContain(
      "30",
    );
    expect(lookup(en, "Landing.plans.pro.features.fiveMenus")).toContain("5");
  });
});

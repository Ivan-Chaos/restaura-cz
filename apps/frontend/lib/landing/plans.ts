import type { Money } from "@/lib/design-system/types";

/**
 * The pricing catalogue.
 *
 * Kept as typed data rather than markup so the numbers the spec commits to
 * (1 menu, 30 items, 5 menus, 129 CZK) live in one place a unit test can assert
 * against, and so changing a tier never means editing a component.
 *
 * Display strings are *not* here: each entry carries message-key suffixes that
 * `PlanCard` resolves through `next-intl`. A plan is the same product in Czech,
 * English and German; only its wording differs.
 */

export type PlanId = "free" | "pro" | "proPlus";

export type PlanAvailability = "available" | "comingSoon";

/** What activating the plan's button does. A coming-soon plan can never sell. */
export type PlanCtaKind = "signup" | "notify";

/**
 * Feature lines, spelled out as full message keys under the `Landing`
 * namespace rather than as short ids joined at render time. Verbose, and worth
 * it: written this way TypeScript checks every line against the catalogue, so a
 * feature the translators never received fails the build instead of rendering
 * as a raw key on the pricing table.
 */
export type PlanFeatureKey =
  | "plans.free.features.oneMenu"
  | "plans.free.features.thirtyItems"
  | "plans.free.features.brandedPdf"
  | "plans.free.features.brandedQr"
  | "plans.pro.features.fiveMenus"
  | "plans.pro.features.unlimitedItems"
  | "plans.pro.features.noBranding"
  | "plans.proPlus.features.menuParsing"
  | "plans.proPlus.features.unlimitedMenus"
  | "plans.proPlus.features.unlimitedSize"
  | "plans.proPlus.features.timeMenus"
  | "plans.proPlus.features.qrCodes"
  | "plans.proPlus.features.pdfTemplates";

export interface Plan {
  id: PlanId;
  availability: PlanAvailability;
  /**
   * `null` means the card shows words instead of a number — "Free" for the free
   * tier, "Coming soon" for the top tier whose price is not set yet. Adding a
   * price to Pro Plus later is a data change, not a layout change.
   */
  price: Money | null;
  /** Only meaningful when `price` is set. */
  period: "month" | null;
  /** Message keys under the `Landing` namespace, in display order. */
  features: readonly PlanFeatureKey[];
  cta: PlanCtaKind;
  /** Exactly one plan is the recommended starting point. */
  recommended: boolean;
}

export const PLANS: readonly Plan[] = [
  {
    id: "free",
    availability: "available",
    price: null,
    period: null,
    features: ["plans.free.features.oneMenu", "plans.free.features.thirtyItems", "plans.free.features.brandedPdf", "plans.free.features.brandedQr"],
    cta: "signup",
    recommended: true,
  },
  {
    id: "pro",
    availability: "comingSoon",
    price: { amount: 129, currency: "CZK" },
    period: "month",
    features: ["plans.pro.features.fiveMenus", "plans.pro.features.unlimitedItems", "plans.pro.features.noBranding"],
    cta: "notify",
    recommended: false,
  },
  {
    id: "proPlus",
    availability: "comingSoon",
    price: null,
    period: null,
    features: [
      "plans.proPlus.features.menuParsing",
      "plans.proPlus.features.unlimitedMenus",
      "plans.proPlus.features.unlimitedSize",
      "plans.proPlus.features.timeMenus",
      "plans.proPlus.features.qrCodes",
      "plans.proPlus.features.pdfTemplates",
    ],
    cta: "notify",
    recommended: false,
  },
];

export function getPlan(id: PlanId): Plan {
  const plan = PLANS.find((candidate) => candidate.id === id);
  if (!plan) throw new Error(`Unknown plan: ${id}`);
  return plan;
}

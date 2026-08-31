import type { MediaAssetId } from "./assets";

/**
 * What the page says the product does, and how a restaurant gets started.
 *
 * Only the three capabilities that ship in the first iteration appear here.
 * Anything further out belongs in a coming-soon plan card, never in a feature
 * section — a marketing page that describes software nobody can use yet is how
 * trust is lost.
 *
 * Icons are named rather than imported so this module stays free of React and
 * can be read by tests and scripts; `components/landing` maps the name to the
 * lucide component.
 */

export type CapabilityId = "digitalMenu" | "pdf" | "qr";

export type CapabilityIconName = "Smartphone" | "FileText" | "QrCode";

export interface Capability {
  id: CapabilityId;
  /** Ascending display order. */
  order: number;
  icon: CapabilityIconName;
  /**
   * A photograph, or — when no honest, unbranded photograph exists — a drawing
   * of the thing itself. Exactly one of the two is always set.
   */
  asset?: MediaAssetId;
  illustration?: "tableTent";
  /** Alternating sides give the section rhythm on wide viewports. */
  align: "mediaLeft" | "mediaRight";
  /**
   * Only the digital menu has something live to show today. The label key is
   * carried alongside the link rather than derived from the id, so the
   * catalogue only has to contain a `demo` string for the capability that has
   * a demo — and TypeScript checks that it does.
   */
  demoHref?: string;
  demoLabelKey?: "capabilities.digitalMenu.demo";
}

export const CAPABILITIES: readonly Capability[] = [
  {
    id: "digitalMenu",
    order: 1,
    icon: "Smartphone",
    asset: "digitalMenu",
    align: "mediaRight",
    demoHref: "/sample-menu",
    demoLabelKey: "capabilities.digitalMenu.demo",
  },
  {
    id: "pdf",
    order: 2,
    icon: "FileText",
    asset: "pdf",
    align: "mediaLeft",
  },
  {
    id: "qr",
    order: 3,
    icon: "QrCode",
    illustration: "tableTent",
    align: "mediaRight",
  },
];

export type StepId = "create" | "generate" | "scan";

export type StepIconName = "PencilLine" | "Sparkles" | "ScanLine";

export interface Step {
  id: StepId;
  icon: StepIconName;
}

/** The three-beat "you can do this before service" story. */
export const STEPS: readonly Step[] = [
  { id: "create", icon: "PencilLine" },
  { id: "generate", icon: "Sparkles" },
  { id: "scan", icon: "ScanLine" },
];

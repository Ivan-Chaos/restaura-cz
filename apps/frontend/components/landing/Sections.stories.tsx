import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { CAPABILITIES, STEPS } from "@/lib/landing/capabilities";
import { PLANS } from "@/lib/landing/plans";

import { CapabilitySection } from "./CapabilitySection";
import { LandingFooter } from "./LandingFooter";
import { LandingHeader } from "./LandingHeader";
import { Pricing } from "./Pricing";
import { Reveal } from "./Reveal";
import { StepsStrip } from "./StepsStrip";
import { TableTent } from "./TableTent";

/**
 * The page's remaining blocks, gathered in one file because each is a thin
 * composition whose interesting behaviour is structural rather than
 * interactive.
 */
const meta = {
  title: "Landing/Sections",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const capability = (id: string) =>
  CAPABILITIES.find((c) => c.id === id) ?? CAPABILITIES[0];

export const DigitalMenu: Story = {
  render: () => <CapabilitySection capability={capability("digitalMenu")} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { level: 2 })).toBeVisible();
    // A photograph a screen-reader user cannot see needs describing.
    await expect(canvas.getByRole("img")).toHaveAccessibleName();
    // Only this capability has something live to link to.
    await expect(canvas.getAllByRole("link").length).toBeGreaterThan(0);
  },
};

export const PdfExport: Story = {
  render: () => <CapabilitySection capability={capability("pdf")} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("img")).toHaveAccessibleName();
  },
};

/** Drawn rather than photographed — see `TableTent` for why. */
export const TableQrCodes: Story = {
  render: () => <CapabilitySection capability={capability("qr")} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("img")).toHaveAccessibleName();
  },
};

export const Illustration: Story = {
  render: () => (
    <div className="bg-background flex justify-center p-8">
      <TableTent className="max-w-sm" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("img")).toHaveAccessibleName();
  },
};

export const Steps: Story = {
  render: () => <StepsStrip steps={STEPS} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // An ordered list, so the sequence is announced without being described.
    await expect(canvas.getAllByRole("listitem")).toHaveLength(3);
  },
};

export const PricingTable: Story = {
  render: () => <Pricing plans={PLANS} />,
  play: async ({ canvasElement }) => {
    const plans = canvasElement.querySelectorAll("[data-plan]");
    await expect(
      Array.from(plans).map((el) => el.getAttribute("data-plan")),
    ).toEqual(["free", "pro", "proPlus"]);
  },
};

/** Over a scrim, which is the only surface this header is ever used on. */
export const HeaderOverMedia: Story = {
  render: () => (
    <div className="bg-overlay relative min-h-64">
      <LandingHeader />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("banner")).toBeVisible();
    // Language and appearance controls both reachable.
    await expect(canvas.getAllByRole("button").length).toBeGreaterThan(0);
  },
};

export const Footer: Story = {
  render: () => <LandingFooter />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("contentinfo")).toBeVisible();
    // No dead ends: every footer link goes somewhere.
    for (const link of canvas.getAllByRole("link")) {
      await expect(link.getAttribute("href")).not.toBe("#");
    }
  },
};

/**
 * Server-rendered content is the *visible* state; the reveal only ever hides
 * something after hydration, and never under reduced motion.
 */
export const RevealedContent: Story = {
  render: () => (
    <div className="bg-background p-8">
      <Reveal>
        <p>Visible with or without JavaScript.</p>
      </Reveal>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("Visible with or without JavaScript."),
    ).toBeVisible();
  },
};

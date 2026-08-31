import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { getPlan } from "@/lib/landing/plans";

import { PlanCard } from "./PlanCard";

/**
 * One tier. These stories are where the promises on the pricing table get
 * checked: the numbers the spec commits to, and the rule that a tier which has
 * not launched says so in words and cannot be bought.
 */
const meta = {
  title: "Landing/PlanCard",
  component: PlanCard,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className="bg-background w-80 max-w-full p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PlanCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Free: Story = {
  args: { plan: getPlan("free") },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const card = canvas.getByRole("article");

    await expect(card).toHaveAttribute("data-availability", "available");
    // The recommended tier is marked in text, not only by its ring.
    await expect(card.textContent).toMatch(/\S/);
    await expect(canvas.getByRole("link")).toHaveAttribute("href");

    // Four promises, and the two numbers among them.
    await expect(canvas.getAllByRole("listitem")).toHaveLength(4);
    await expect(card.textContent).toContain("1");
    await expect(card.textContent).toContain("30");
  },
};

export const Pro: Story = {
  args: { plan: getPlan("pro") },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const card = canvas.getByRole("article");

    await expect(card).toHaveAttribute("data-availability", "comingSoon");
    // 129 CZK, formatted for whichever locale this pass is running under.
    await expect(card.textContent).toContain("129");
    await expect(canvas.getAllByRole("listitem")).toHaveLength(3);

    // Never a checkout.
    const cta = canvas.getByRole("link");
    await expect(cta.getAttribute("href")).not.toMatch(/checkout|payment/i);
  },
};

export const ProPlus: Story = {
  args: { plan: getPlan("proPlus") },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const card = canvas.getByRole("article");

    await expect(card).toHaveAttribute("data-availability", "comingSoon");
    await expect(canvas.getAllByRole("listitem")).toHaveLength(6);

    // The top tier deliberately shows no number: its price is not decided, and
    // inventing one would be a promise nobody made.
    await expect(card.textContent).not.toMatch(/\d+\s*(Kč|CZK)/);
  },
};

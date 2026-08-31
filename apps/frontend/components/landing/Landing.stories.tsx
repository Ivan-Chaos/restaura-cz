import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { Landing } from "./Landing";

/**
 * The whole page, which is the only place some things can be checked: that
 * there is exactly one `h1`, that all three capabilities are present and in
 * order, and that the pricing table says what the spec says it says.
 *
 * The second Vitest pass renders this under slate / dark / German — the
 * combination that finds hard-coded colours and copy that only fits in English.
 */
const meta = {
  title: "Landing/Landing",
  component: Landing,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof Landing>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FullPage: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // One page, one first-level heading.
    await expect(canvas.getAllByRole("heading", { level: 1 })).toHaveLength(1);

    // Three shipped capabilities, in the order the page argues them.
    const capabilities = canvasElement.querySelectorAll("[data-capability]");
    await expect(
      Array.from(capabilities).map((el) => el.getAttribute("data-capability")),
    ).toEqual(["digitalMenu", "pdf", "qr"]);

    // Three tiers, free first.
    const plans = canvasElement.querySelectorAll("[data-plan]");
    await expect(
      Array.from(plans).map((el) => el.getAttribute("data-plan")),
    ).toEqual(["free", "pro", "proPlus"]);

    // Exactly one tier can be bought into today; the rest capture interest.
    const available = canvasElement.querySelectorAll(
      '[data-availability="available"]',
    );
    await expect(available).toHaveLength(1);

    // Nothing on this page may mention ordering (spec FR-019). The ordering
    // components are documentation-only until ordering actually ships.
    await expect(canvasElement.querySelectorAll("[data-ordering]")).toHaveLength(
      0,
    );
  },
};

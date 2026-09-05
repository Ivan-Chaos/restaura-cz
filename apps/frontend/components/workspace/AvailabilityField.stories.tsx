import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";

import type { AvailabilityId } from "@/lib/design-system/dietary";

import { AvailabilityField, type AvailabilityFieldProps } from "./AvailabilityField";

/** Stateful wrapper — `AvailabilityField` is a controlled component. */
function AvailabilityFieldDemo({ value: initial }: Pick<AvailabilityFieldProps, "value">) {
  const [value, setValue] = useState<AvailabilityId>(initial);
  return (
    <div className="max-w-lg p-4">
      <AvailabilityField idPrefix="story" value={value} onChange={setValue} />
    </div>
  );
}

const meta = {
  title: "Workspace/AvailabilityField",
  component: AvailabilityFieldDemo,
  parameters: { layout: "padded" },
  args: { value: "available" },
} satisfies Meta<typeof AvailabilityFieldDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Available: Story = {};

/** Still on the menu, and a guest reads why they may not get it. */
export const SoldOut: Story = { args: { value: "soldOut" } };

/** Off the menu entirely — the guest page and the PDF never mention it. */
export const Hidden: Story = { args: { value: "hidden" } };

/**
 * Four states, because "hidden" is not a degree of "sold out": the first three
 * are things a guest reads, and the fourth is a dish they never see.
 */
export const OffersEveryState: Story = {
  play: async ({ canvasElement }) => {
    const options = canvasElement.querySelectorAll<HTMLInputElement>(
      'input[name="availability"]',
    );

    await expect(Array.from(options, (option) => option.value)).toEqual([
      "available",
      "limited",
      "soldOut",
      "hidden",
    ]);
  },
};

/**
 * The hint is always present, not revealed once "hidden" is chosen: what the
 * word does is what an owner needs to know *before* choosing it.
 */
export const ExplainsHidingBeforeItIsChosen: Story = {
  play: async ({ canvasElement }) => {
    const group = canvasElement.querySelector('[role="radiogroup"]');
    const hintId = group?.getAttribute("aria-describedby");

    await expect(hintId).toBeTruthy();
    await expect(canvasElement.querySelector(`#${hintId}`)).toBeVisible();
  },
};

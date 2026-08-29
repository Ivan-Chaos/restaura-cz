import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import type { Availability } from "@/lib/design-system/types";
import { AvailabilitySwitch, type AvailabilitySwitchProps } from "./AvailabilitySwitch";

/** Stateful wrapper — `AvailabilitySwitch` is a controlled component. */
function AvailabilitySwitchDemo({ value: initialValue }: Pick<AvailabilitySwitchProps, "value">) {
  const [value, setValue] = useState<Availability>(initialValue);
  return (
    <div className="max-w-sm p-4">
      <AvailabilitySwitch value={value} onChange={setValue} />
    </div>
  );
}

const meta = {
  title: "Forms/Availability Switch",
  component: AvailabilitySwitchDemo,
} satisfies Meta<typeof AvailabilitySwitchDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The common case — the `Select` refinement is hidden entirely. */
export const Available: Story = {
  args: { value: "available" },
};

export const Limited: Story = {
  args: { value: "limited" },
};

export const SoldOut: Story = {
  args: { value: "soldOut" },
};

/**
 * Turning the switch off, then back on, then off again must restore the
 * refinement that was last chosen ("limited") rather than resetting to
 * "sold out" — otherwise a stray double-click would quietly change what
 * staff had deliberately set.
 */
export const TogglingPreservesRefinement: Story = {
  args: { value: "limited" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = canvas.getByRole("switch");
    const select = canvas.getByRole("combobox");

    await expect(select).toHaveTextContent(/./); // refinement visible while off

    await userEvent.click(toggle); // available
    await expect(canvas.queryByRole("combobox")).not.toBeInTheDocument();

    await userEvent.click(toggle); // back off
    await expect(canvas.getByRole("combobox")).toHaveTextContent(select.textContent ?? "");
  },
};

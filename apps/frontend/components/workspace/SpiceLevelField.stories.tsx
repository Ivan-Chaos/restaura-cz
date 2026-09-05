import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";

import type { SpiceLevel } from "@/lib/design-system/types";

import { SpiceLevelField, type SpiceLevelFieldProps } from "./SpiceLevelField";

/** Stateful wrapper — `SpiceLevelField` is a controlled component. */
function SpiceLevelFieldDemo({ value: initial }: Pick<SpiceLevelFieldProps, "value">) {
  const [value, setValue] = useState<SpiceLevel>(initial);
  return (
    <div className="max-w-lg p-4">
      <SpiceLevelField idPrefix="story" value={value} onChange={setValue} />
    </div>
  );
}

const meta = {
  title: "Workspace/SpiceLevelField",
  component: SpiceLevelFieldDemo,
  parameters: { layout: "padded" },
  args: { value: 0 },
} satisfies Meta<typeof SpiceLevelFieldDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Nought is what a dish is unless somebody says otherwise. */
export const NotSpicy: Story = {};

export const Hot: Story = { args: { value: 3 } };

/**
 * Radios, not buttons — the whole reason this is not a `Toggle` group. A
 * control that posted nothing would silently reset every saved dish to "not
 * spicy" for an owner whose JavaScript never loaded.
 */
export const PostsExactlyOneValue: Story = {
  args: { value: 2 },
  play: async ({ canvasElement }) => {
    const checked = canvasElement.querySelectorAll<HTMLInputElement>(
      'input[name="spiceLevel"]:checked',
    );

    await expect(checked).toHaveLength(1);
    // `toHaveValue` refuses a radio; the attribute is what gets posted.
    await expect(checked[0]).toHaveAttribute("value", "2");
  },
};

/**
 * The flames are decoration; each option's accessible name says the level in
 * words, so nobody has to count icons — or see them at all.
 */
export const EveryOptionIsNamed: Story = {
  play: async ({ canvas }) => {
    const options = canvas.getAllByRole("radio");

    await expect(options).toHaveLength(4);
    for (const option of options) {
      await expect(option).toHaveAccessibleName();
    }
  },
};

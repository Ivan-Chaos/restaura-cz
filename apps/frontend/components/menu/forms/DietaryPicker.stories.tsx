import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import type { AllergenNumber, DietaryMarkerId } from "@/lib/design-system/dietary";
import { DietaryPicker, type DietaryPickerProps } from "./DietaryPicker";

/** Stateful wrapper — `DietaryPicker` is a controlled component. */
function DietaryPickerDemo({
  value: initialValue,
  allergens: initialAllergens,
}: Pick<DietaryPickerProps, "value" | "allergens">) {
  const [state, setState] = useState<{
    dietary: DietaryMarkerId[];
    allergens: AllergenNumber[];
  }>({ dietary: initialValue, allergens: initialAllergens });

  return (
    <div className="max-w-lg p-4">
      <DietaryPicker value={state.dietary} allergens={state.allergens} onChange={setState} />
    </div>
  );
}

const meta = {
  title: "Forms/Dietary Picker",
  component: DietaryPickerDemo,
  args: {
    value: [],
    allergens: [],
  },
} satisfies Meta<typeof DietaryPickerDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Preset: Story = {
  args: {
    value: ["vegetarian", "spicy"],
    allergens: [1, 7],
  },
};

/**
 * Toggles the first dietary marker with the keyboard only, and asserts the
 * pressed state actually flips both ways. Selected by position (not by
 * translated name) so the assertion holds under every locale the suite runs
 * against.
 */
export const KeyboardToggle: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [firstMarker] = canvas.getAllByRole("button");

    firstMarker.focus();
    await expect(firstMarker).toHaveFocus();
    await expect(firstMarker).toHaveAttribute("aria-pressed", "false");

    await userEvent.keyboard("{Enter}");
    await expect(firstMarker).toHaveAttribute("aria-pressed", "true");

    await userEvent.keyboard(" ");
    await expect(firstMarker).toHaveAttribute("aria-pressed", "false");
  },
};

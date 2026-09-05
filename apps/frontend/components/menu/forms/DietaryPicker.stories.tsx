import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import type {
  AllergenNumber,
  ApiDietaryId,
  DishWarningId,
} from "@/lib/design-system/dietary";
import { DietaryPicker, type DietaryPickerProps } from "./DietaryPicker";

/** Stateful wrapper — `DietaryPicker` is a controlled component. */
function DietaryPickerDemo({
  value: initialValue,
  allergens: initialAllergens,
  warnings: initialWarnings,
}: Pick<DietaryPickerProps, "value" | "allergens" | "warnings">) {
  const [state, setState] = useState<{
    dietary: ApiDietaryId[];
    allergens: AllergenNumber[];
    warnings: DishWarningId[];
  }>({ dietary: initialValue, allergens: initialAllergens, warnings: initialWarnings });

  return (
    <div className="max-w-lg p-4">
      <DietaryPicker
        idPrefix="story"
        value={state.dietary}
        allergens={state.allergens}
        warnings={state.warnings}
        onChange={setState}
      />
    </div>
  );
}

const meta = {
  title: "Forms/Dietary Picker",
  component: DietaryPickerDemo,
  args: {
    value: [],
    allergens: [],
    warnings: [],
  },
} satisfies Meta<typeof DietaryPickerDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Preset: Story = {
  args: {
    // `spicy` is not here and cannot be: heat is a degree, and it lives in its
    // own field. `lenten` is the observance that arrived with feature 008.
    value: ["vegetarian", "lenten"],
    allergens: [1, 7],
    warnings: ["rawOrUndercooked"],
  },
};

/**
 * Toggles the first dietary marker with the keyboard only, and asserts the
 * checked state actually flips both ways. Selected by position (not by
 * translated name) so the assertion holds under every locale the suite runs
 * against.
 *
 * The controls are real checkboxes rather than `Toggle` buttons, which is what
 * lets an owner declare an allergen with no client JavaScript — so this asserts
 * `checked`, not `aria-pressed`.
 */
export const KeyboardToggle: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [firstMarker] = canvas.getAllByRole("checkbox");

    firstMarker?.focus();
    await expect(firstMarker).toHaveFocus();
    await expect(firstMarker).not.toBeChecked();

    await userEvent.keyboard(" ");
    await expect(firstMarker).toBeChecked();

    await userEvent.keyboard(" ");
    await expect(firstMarker).not.toBeChecked();
  },
};

/**
 * Every chip posts under one of three repeated names, which is the whole reason
 * they are checkboxes: `getAll("allergens")` in the Server Action is the same
 * reading whether the browser ran our JavaScript or simply submitted the form.
 */
export const PostsUnderRepeatedNames: Story = {
  args: {
    value: ["vegan"],
    allergens: [3, 7],
    warnings: ["containsAlcohol"],
  },
  play: async ({ canvasElement }) => {
    const checked = canvasElement.querySelectorAll<HTMLInputElement>("input:checked");
    const posted = new FormData();
    for (const input of checked) posted.append(input.name, input.value);

    await expect(posted.getAll("dietary")).toEqual(["vegan"]);
    await expect(posted.getAll("allergens")).toEqual(["3", "7"]);
    await expect(posted.getAll("warnings")).toEqual(["containsAlcohol"]);
  },
};

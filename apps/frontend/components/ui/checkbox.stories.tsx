import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { Checkbox } from "./checkbox";
import { Label } from "./label";

/**
 * Checkbox is for an independent yes/no choice — "no onions", "make it
 * spicy", "I agree to the allergen disclaimer" — where any number of options
 * can be on at once. Use `RadioGroup` instead when only one of several
 * options can be selected, and `Switch` for a setting that takes effect
 * immediately (like toggling dark mode) rather than a choice submitted with a
 * form. Every checkbox needs a visible, associated label — never rely on a
 * placeholder or surrounding text alone.
 */
const meta = {
  title: "UI/Checkbox",
  component: Checkbox,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "An independent yes/no choice for order customization — 'no onions', 'extra spicy', 'I agree to the allergen disclaimer' — where several can be checked at once. Use `RadioGroup` when only one of several options is allowed, and `Switch` for a setting that applies immediately rather than one submitted with a form.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {
  render: () => (
    <Label className="items-start gap-2">
      <Checkbox id="no-onions" />
      No onions
    </Label>
  ),
};

export const Checked: Story = {
  render: () => (
    <Label className="items-start gap-2">
      <Checkbox id="extra-spicy" defaultChecked />
      Extra spicy
    </Label>
  ),
};

export const Indeterminate: Story = {
  name: "Indeterminate (mixed selection)",
  render: () => (
    <Label className="items-start gap-2">
      <Checkbox id="select-all-sides" indeterminate />
      Select all sides
    </Label>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <Label className="items-start gap-2">
        <Checkbox id="disabled-unchecked" disabled />
        Gift wrap (unavailable for delivery orders)
      </Label>
      <Label className="items-start gap-2">
        <Checkbox id="disabled-checked" disabled defaultChecked />
        Includes cutlery
      </Label>
    </div>
  ),
};

export const Invalid: Story = {
  name: "Invalid (required and unchecked)",
  render: () => (
    <Label className="items-start gap-2">
      <Checkbox id="agree-terms" aria-invalid="true" required />
      I agree to the allergen disclaimer
    </Label>
  ),
};

export const KeyboardToggle: Story = {
  render: () => (
    <Label className="items-start gap-2">
      <Checkbox id="keyboard-demo" />
      No onions
    </Label>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const checkbox = canvas.getByRole("checkbox", { name: "No onions" });

    await expect(checkbox).toHaveAttribute("aria-checked", "false");

    checkbox.focus();
    await userEvent.keyboard(" ");
    await expect(checkbox).toHaveAttribute("aria-checked", "true");

    await userEvent.keyboard(" ");
    await expect(checkbox).toHaveAttribute("aria-checked", "false");
  },
};

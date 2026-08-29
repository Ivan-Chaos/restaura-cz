import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { RadioGroup, RadioGroupItem } from "./radio-group";
import { Label } from "./label";

/**
 * RadioGroup is for choosing exactly one option among a small, visible set —
 * spice level, delivery method, portion size. Use `Checkbox` instead when any
 * number of options (including zero) can be selected, and `Select` instead
 * when the list is long enough that showing every option at once would
 * crowd the page. Each `RadioGroupItem` needs its own label, and the group
 * itself benefits from a heading via `FieldSet`/`FieldLegend` when it isn't
 * obvious from surrounding context.
 */
const meta = {
  title: "UI/RadioGroup",
  component: RadioGroup,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Exactly-one-of-many selection for a small, visible set of options: spice level, delivery method, portion size. Use `Checkbox` when several can be selected, and `Select` when the list is long enough to crowd the page. Give each item its own label and, when the group needs a heading, wrap it in `FieldSet`/`FieldLegend`.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SpiceLevel: Story = {
  name: "Default (spice level)",
  render: () => (
    <RadioGroup defaultValue="mild" className="max-w-sm">
      <Label className="items-start gap-2">
        <RadioGroupItem value="mild" />
        Mild
      </Label>
      <Label className="items-start gap-2">
        <RadioGroupItem value="medium" />
        Medium
      </Label>
      <Label className="items-start gap-2">
        <RadioGroupItem value="hot" />
        Hot
      </Label>
    </RadioGroup>
  ),
};

export const Disabled: Story = {
  render: () => (
    <RadioGroup defaultValue="pickup" disabled className="max-w-sm">
      <Label className="items-start gap-2">
        <RadioGroupItem value="pickup" />
        Pick up in the restaurant
      </Label>
      <Label className="items-start gap-2">
        <RadioGroupItem value="delivery" />
        Deliver to my address
      </Label>
    </RadioGroup>
  ),
};

export const DisabledItem: Story = {
  name: "Single disabled option",
  render: () => (
    <RadioGroup defaultValue="regular" className="max-w-sm">
      <Label className="items-start gap-2">
        <RadioGroupItem value="regular" />
        Regular (0.3l)
      </Label>
      <Label className="items-start gap-2">
        <RadioGroupItem value="large" disabled />
        Large (0.5l) — out of stock
      </Label>
    </RadioGroup>
  ),
};

export const KeyboardNavigation: Story = {
  render: () => (
    <RadioGroup defaultValue="mild" className="max-w-sm">
      <Label className="items-start gap-2">
        <RadioGroupItem value="mild" />
        Mild
      </Label>
      <Label className="items-start gap-2">
        <RadioGroupItem value="medium" />
        Medium
      </Label>
      <Label className="items-start gap-2">
        <RadioGroupItem value="hot" />
        Hot
      </Label>
    </RadioGroup>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const mild = canvas.getByRole("radio", { name: "Mild" });
    const medium = canvas.getByRole("radio", { name: "Medium" });

    await expect(mild).toHaveAttribute("aria-checked", "true");

    mild.focus();
    await userEvent.keyboard("{ArrowDown}");

    await expect(medium).toHaveAttribute("aria-checked", "true");
    await expect(mild).toHaveAttribute("aria-checked", "false");
  },
};

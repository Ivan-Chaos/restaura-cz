import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { QuantityStepper, type QuantityStepperProps } from "./QuantityStepper";

/** Controlled wrapper: the real component takes no state of its own. */
function ControlledQuantityStepper(
  props: Omit<QuantityStepperProps, "value" | "onChange"> & { initialValue?: number },
) {
  const { initialValue = 1, ...rest } = props;
  const [value, setValue] = useState(initialValue);
  return <QuantityStepper {...rest} value={value} onChange={setValue} />;
}

const meta = {
  title: "Ordering (future)/QuantityStepper",
  component: QuantityStepper,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Not shipped yet — the guest menu has nothing to count today. Reserved for a future ordering flow's \"how many of this dish\" control, so it can share the menu's visual language instead of growing a second one.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof QuantityStepper>;

export default meta;
type Story = StoryObj<typeof meta>;

// `value`/`onChange` in `args` below are unused placeholders: the render
// function funnels everything through `ControlledQuantityStepper`, which
// owns real state and always wins because its own `value`/`onChange` are
// spread after `...rest`. They exist only so `args` satisfies the full
// `QuantityStepperProps` type these story annotations require.
const noop = () => {};

export const Default: Story = {
  render: (args) => <ControlledQuantityStepper {...args} initialValue={1} />,
  args: {
    value: 1,
    onChange: noop,
    min: 1,
    max: 10,
  },
};

export const AtMinimum: Story = {
  render: (args) => <ControlledQuantityStepper {...args} initialValue={1} />,
  args: { value: 1, onChange: noop, min: 1, max: 10 },
};

export const AtMaximum: Story = {
  render: (args) => <ControlledQuantityStepper {...args} initialValue={10} />,
  args: { value: 10, onChange: noop, min: 1, max: 10 },
};

export const Interaction: Story = {
  render: (args) => <ControlledQuantityStepper {...args} initialValue={1} />,
  args: { value: 1, onChange: noop, min: 1, max: 3 },
  play: async ({ canvasElement }) => {
    // Button names are localized, so this looks them up by DOM order
    // (decrease, then increase) rather than by their English text — the
    // story runs the same assertions in every locale the Vitest addon
    // exercises.
    const canvas = within(canvasElement);
    const spinbutton = canvas.getByRole("spinbutton");
    const [decrease, increase] = canvas.getAllByRole("button");

    await expect(spinbutton).toHaveAttribute("aria-valuenow", "1");
    await expect(decrease).toBeDisabled();

    await userEvent.click(increase);
    await expect(spinbutton).toHaveAttribute("aria-valuenow", "2");
    await expect(decrease).not.toBeDisabled();

    spinbutton.focus();
    await userEvent.keyboard("{ArrowUp}");
    await expect(spinbutton).toHaveAttribute("aria-valuenow", "3");
    await expect(increase).toBeDisabled();

    await userEvent.keyboard("{ArrowDown}");
    await expect(spinbutton).toHaveAttribute("aria-valuenow", "2");
    await expect(increase).not.toBeDisabled();

    await userEvent.click(decrease);
    await expect(spinbutton).toHaveAttribute("aria-valuenow", "1");
    await expect(decrease).toBeDisabled();
  },
};

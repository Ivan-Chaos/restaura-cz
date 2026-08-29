import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import type { OptionGroupModel } from "@/lib/design-system/ordering-types";

import { OptionGroup, type OptionGroupProps } from "./OptionGroup";

/** Controlled wrapper: the real component takes no state of its own. */
function ControlledOptionGroup(props: Omit<OptionGroupProps, "value" | "onChange">) {
  const [value, setValue] = useState<string[]>([]);
  return <OptionGroup {...props} value={value} onChange={setValue} />;
}

const sizeGroup: OptionGroupModel = {
  id: "size",
  name: "Size",
  selection: "single",
  min: 1,
  max: 1,
  options: [
    { id: "regular", name: "Regular" },
    { id: "large", name: "Large", priceDelta: { amount: 30, currency: "CZK" } },
  ],
};

const extrasGroup: OptionGroupModel = {
  id: "extras",
  name: "Extras",
  selection: "multiple",
  min: 0,
  max: 2,
  options: [
    { id: "cheese", name: "Extra cheese", priceDelta: { amount: 20, currency: "CZK" } },
    { id: "bacon", name: "Bacon", priceDelta: { amount: 35, currency: "CZK" } },
    { id: "jalapenos", name: "Jalapeños", available: false },
  ],
};

const meta = {
  title: "Ordering (future)/OptionGroup",
  component: OptionGroup,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Not shipped yet — a guest today only reads a dish's description, they never pick a size or an extra. Reserved for a future ordering flow's option picker, sharing the menu's `Field` styling and price formatting.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof OptionGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

// `value`/`onChange` placeholders below: render funnels through
// `ControlledOptionGroup`, which owns real state and always wins because
// its own `value`/`onChange` are spread after the incoming args. They exist
// only so `args` satisfies the full `OptionGroupProps` type.
const noop = () => {};

export const Single: Story = {
  render: (args) => <ControlledOptionGroup {...args} />,
  args: { group: sizeGroup, value: [], onChange: noop },
};

export const Multiple: Story = {
  render: (args) => <ControlledOptionGroup {...args} />,
  args: { group: extrasGroup, value: [], onChange: noop },
};

export const WithError: Story = {
  render: (args) => <ControlledOptionGroup {...args} />,
  args: { group: sizeGroup, value: [], onChange: noop, error: "Required" },
};

export const SelectSingle: Story = {
  render: (args) => <ControlledOptionGroup {...args} />,
  args: { group: sizeGroup, value: [], onChange: noop },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const large = canvas.getByRole("radio", { name: /Large/ });

    await userEvent.click(large);
    await expect(large).toHaveAttribute("aria-checked", "true");
  },
};

export const SelectMultiple: Story = {
  render: (args) => <ControlledOptionGroup {...args} />,
  args: { group: extrasGroup, value: [], onChange: noop },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const cheese = canvas.getByRole("checkbox", { name: /Extra cheese/ });
    const bacon = canvas.getByRole("checkbox", { name: /Bacon/ });
    const jalapenos = canvas.getByRole("checkbox", { name: /Jalapeños/ });

    await userEvent.click(cheese);
    await userEvent.click(bacon);

    await expect(cheese).toHaveAttribute("aria-checked", "true");
    await expect(bacon).toHaveAttribute("aria-checked", "true");
    // Base UI's Checkbox renders `role="checkbox"` on a <span>, not a native
    // <input>, so its disabled state surfaces as `aria-disabled` rather than
    // the real `disabled` attribute `toBeDisabled()` checks for.
    await expect(jalapenos).toHaveAttribute("aria-disabled", "true");
  },
};

export const ErrorIsAnnounced: Story = {
  render: (args) => <ControlledOptionGroup {...args} />,
  args: { group: sizeGroup, value: [], onChange: noop, error: "Required" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const alert = canvas.getByRole("alert");

    await expect(alert).toHaveTextContent("Required");
  },
};

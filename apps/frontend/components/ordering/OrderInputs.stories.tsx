import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { CurrencyInput, type CurrencyInputProps } from "./CurrencyInput";
import { SpecialRequestField, type SpecialRequestFieldProps } from "./SpecialRequestField";

/**
 * Shared story file: `CurrencyInput` and `SpecialRequestField` are two small,
 * unrelated form controls that don't each warrant their own top-level
 * Storybook page. Both are controlled, so each gets a small `useState`
 * wrapper here rather than inside the component.
 */

function ControlledCurrencyInput(props: Omit<CurrencyInputProps, "value" | "onChange">) {
  const [value, setValue] = useState<number | undefined>(undefined);
  return <CurrencyInput {...props} value={value} onChange={setValue} />;
}

function ControlledSpecialRequestField(
  props: Omit<SpecialRequestFieldProps, "value" | "onChange">,
) {
  const [value, setValue] = useState("");
  return <SpecialRequestField {...props} value={value} onChange={setValue} />;
}

const meta = {
  title: "Ordering (future)/Order Inputs",
  component: CurrencyInput,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Not shipped yet — a guest today has no amount to name and no order to attach a note to. `CurrencyInput` and `SpecialRequestField` are reserved for a future ordering flow (a custom tip, a kitchen note) and share this story file because neither is large enough to need its own.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof CurrencyInput>;

export default meta;
type Story = StoryObj<typeof meta>;

// `onChange` placeholders below: render funnels through
// `ControlledCurrencyInput`/`ControlledSpecialRequestField`, which own real
// state; they exist only so `args` satisfies the meta component's full
// props type (`CurrencyInputProps` requires `onChange`).
const noop = () => {};

export const Currency: Story = {
  render: (args) => <ControlledCurrencyInput {...args} />,
  args: { currency: "CZK", label: "Tip", onChange: noop },
};

export const CurrencyEUR: Story = {
  name: "Currency (EUR)",
  render: (args) => <ControlledCurrencyInput {...args} />,
  args: { currency: "EUR", label: "Tip", onChange: noop },
};

export const CurrencyDisabled: Story = {
  name: "Currency (disabled)",
  render: (args) => <ControlledCurrencyInput {...args} />,
  args: { currency: "CZK", label: "Tip", disabled: true, onChange: noop },
};

export const CurrencyTypeInvalid: Story = {
  name: "Currency (non-numeric entry is withheld)",
  render: (args) => <ControlledCurrencyInput {...args} />,
  args: { currency: "CZK", label: "Tip", onChange: noop },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText("Tip") as HTMLInputElement;

    await userEvent.type(input, "abc");
    await expect(input).toHaveValue(null);

    await userEvent.type(input, "42");
    await expect(input).toHaveValue(42);
  },
};

export const SpecialRequest: Story = {
  render: () => <ControlledSpecialRequestField />,
  args: { currency: "CZK", onChange: noop },
};

function NearLimitSpecialRequestField() {
  const [value, setValue] = useState("x".repeat(190));
  return <SpecialRequestField value={value} onChange={setValue} />;
}

export const SpecialRequestNearLimit: Story = {
  name: "Special request (near the limit)",
  render: () => <NearLimitSpecialRequestField />,
  args: { currency: "CZK", onChange: noop },
};

export const SpecialRequestCounterUpdates: Story = {
  name: "Special request (counter updates politely)",
  render: () => <ControlledSpecialRequestField />,
  args: { currency: "CZK", onChange: noop },
  play: async ({ canvasElement }) => {
    // The field's own label and the counter's wording are both localized —
    // this looks up the (only) textbox and matches the counter by the
    // number it contains, so the story holds across every locale the
    // Vitest addon exercises.
    const canvas = within(canvasElement);
    const textarea = canvas.getByRole("textbox");

    await userEvent.type(textarea, "No onions please");

    const counter = canvas.getByText(/184/);
    await expect(counter).toHaveAttribute("aria-live", "polite");
  },
};

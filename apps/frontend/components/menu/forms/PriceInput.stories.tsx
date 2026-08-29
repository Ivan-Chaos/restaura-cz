import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import type { PriceModel } from "@/lib/design-system/types";
import { PriceInput, type PriceInputProps } from "./PriceInput";

/** Stateful wrapper — `PriceInput` is a controlled component. */
function PriceInputDemo({ value: initialValue }: Pick<PriceInputProps, "value">) {
  const [value, setValue] = useState<PriceModel>(initialValue);
  return (
    <div className="max-w-lg p-4">
      <PriceInput value={value} onChange={setValue} />
    </div>
  );
}

const meta = {
  title: "Forms/Price Input",
  component: PriceInputDemo,
} satisfies Meta<typeof PriceInputDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = {
  args: { value: { kind: "single", amount: { amount: 189, currency: "CZK" } } },
};

export const From: Story = {
  args: { value: { kind: "from", amount: { amount: 149, currency: "CZK" } } },
};

export const Variants: Story = {
  args: {
    value: {
      kind: "variants",
      variants: [
        { label: "0.3 l", amount: { amount: 45, currency: "CZK" } },
        { label: "0.5 l", amount: { amount: 65, currency: "CZK" } },
      ],
    },
  },
};

export const Market: Story = {
  args: { value: { kind: "market" } },
};

/**
 * Switches kind by clicking the radio options directly (by position — the
 * kind order is fixed: single, from, variants, market) and types an amount,
 * then proves that hiding the amount editor behind "market" and switching
 * back does not silently discard what was typed.
 */
export const SwitchingKindPreservesAmount: Story = {
  args: { value: { kind: "single", amount: { amount: 0, currency: "CZK" } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const radios = canvas.getAllByRole("radio");

    await userEvent.click(radios[0]); // single
    const amountInput = canvas.getByRole("spinbutton");
    await userEvent.clear(amountInput);
    await userEvent.type(amountInput, "249");
    await expect(amountInput).toHaveValue(249);

    await userEvent.click(radios[3]); // market — amount editor unmounts
    await expect(canvas.queryByRole("spinbutton")).not.toBeInTheDocument();

    await userEvent.click(radios[0]); // back to single
    await expect(canvas.getByRole("spinbutton")).toHaveValue(249);
  },
};

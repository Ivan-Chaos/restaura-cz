import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { PhoneInput } from "./PhoneInput";

const PHONE_LABEL = /telefonní číslo|phone number|telefonnummer/i;

/**
 * The component is controlled, so the story owns the value — which is also what
 * lets a play function assert on what the caller would have been handed.
 */
function Harness({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      <PhoneInput
        value={value}
        onChange={setValue}
        aria-label="Telefonní číslo 1"
        name="phones"
      />
      {/* The stored string, so a reader can see what typing produces. */}
      <output className="text-muted-foreground font-mono text-xs">{value || "—"}</output>
    </div>
  );
}

const meta = {
  title: "Auth/PhoneInput",
  component: Harness,
  parameters: { layout: "padded" },
  args: { initial: "" },
} satisfies Meta<typeof Harness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Prefilled: Story = {
  args: { initial: "+420 601 234 567" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The stored international string is split back into the two controls.
    await expect(canvas.getByLabelText(PHONE_LABEL)).toHaveValue("601 234 567");
  },
};

/** Digits are all the owner types; the grouping appears underneath. */
export const FormatsWhileTyping: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText(PHONE_LABEL);

    await userEvent.type(input, "601234567");

    await expect(input).toHaveValue("601 234 567");
    await expect(canvas.getByRole("status")).toHaveTextContent("+420 601 234 567");
  },
};

/** A Slovak number groups differently, which is why the mask is not fixed. */
export const SlovakNumber: Story = {
  args: { initial: "+421 901 123 456" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("status")).toHaveTextContent("+421");
  },
};

/**
 * A value that predates this component, or arrives in an unexpected shape, is
 * still editable rather than silently dropped.
 */
export const UnparseableValue: Story = {
  args: { initial: "call the bar" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText(PHONE_LABEL)).toHaveValue("call the bar");
  },
};

export const Narrow: Story = {
  globals: { viewport: { value: "mobile1" } },
  args: { initial: "+420 601 234 567" },
};

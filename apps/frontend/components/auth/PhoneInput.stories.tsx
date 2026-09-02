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
 * Typing a dialling code moves the picker to that country and takes the code
 * off the front of the number. Without this, a German number typed into a field
 * that said Czechia came out as `+420 49 301 234 56`.
 */
export const AutodetectsFromDiallingCode: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText(PHONE_LABEL);

    await userEvent.type(input, "+4930123456");

    await expect(canvas.getByRole("status")).toHaveTextContent("+49 30123456");
    // The code is the picker's business, so it is gone from the text field.
    await expect(input).toHaveValue("30123456");
    await expect(canvas.getByRole("combobox")).toHaveTextContent("+49");
  },
};

/** The same, from a number written the way it would be dialled. */
export const AutodetectsFromInternationalPrefix: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText(PHONE_LABEL);

    await userEvent.type(input, "00420601234567");

    await expect(canvas.getByRole("status")).toHaveTextContent("+420 601 234 567");
    await expect(input).toHaveValue("601 234 567");
  },
};

/** Pasting is how most foreign numbers actually arrive. */
export const DetectsAPastedNumber: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText(PHONE_LABEL);

    await userEvent.click(input);
    await userEvent.paste("+33 1 23 45 67 89");

    await expect(canvas.getByRole("combobox")).toHaveTextContent("+33");
    await expect(canvas.getByRole("status")).toHaveTextContent("+33 123456789");
  },
};

/**
 * Half a dialling code names no country yet, so nothing is guessed: `+4` could
 * still become +40, +41, +420 or +49, and a picker that jumped to one of them
 * would be moving under the owner's hands.
 */
export const WaitsWhileTheCodeIsIncomplete: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText(PHONE_LABEL);

    await userEvent.type(input, "+4");

    await expect(input).toHaveValue("+4");
    await expect(canvas.getByRole("combobox")).toHaveTextContent("+420");
  },
};

/**
 * Choosing a country wins over a half-typed code in the field. Re-reading the
 * text would answer `+1` with the United States however the owner had just
 * answered it, so the choice clears the stray prefix instead.
 */
export const ChoosingACountryOverridesAHalfTypedCode: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const picker = canvas.getByRole("combobox");

    await userEvent.type(canvas.getByLabelText(PHONE_LABEL), "+1");
    await userEvent.click(picker);
    // The popup is portaled, so it is outside the story's own canvas.
    await userEvent.click(
      await within(document.body).findByRole("option", { name: /\+49$/ }),
    );

    await expect(picker).toHaveTextContent("+49");
    await expect(canvas.getByLabelText(PHONE_LABEL)).toHaveValue("");
  },
};

/** Changing country keeps the digits and regroups them under the new one. */
export const ChoosingACountryKeepsTheDigits: Story = {
  args: { initial: "+420 601 234 567" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const picker = canvas.getByRole("combobox");

    await userEvent.click(picker);
    await userEvent.click(
      await within(document.body).findByRole("option", { name: /\+49$/ }),
    );

    await expect(picker).toHaveTextContent("+49");
    await expect(canvas.getByRole("status")).toHaveTextContent("+49 601234567");
  },
};

/** A stored number from outside the pinned neighbours still comes back whole. */
export const PrefilledNonPinnedCountry: Story = {
  args: { initial: "+33 123456789" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("combobox")).toHaveTextContent("+33");
    await expect(canvas.getByLabelText(PHONE_LABEL)).toHaveValue("123456789");
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

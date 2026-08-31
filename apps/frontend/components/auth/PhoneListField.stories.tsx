import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { PhoneListField } from "./PhoneListField";

const meta = {
  title: "Auth/PhoneListField",
  component: PhoneListField,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="w-full max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PhoneListField>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One empty row, and no way to remove it: a profile needs a number. */
export const Empty: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getAllByRole("textbox")).toHaveLength(1);
    await expect(canvas.queryByRole("button", { name: /odebrat|remove|entfernen/i })).toBeNull();
  },
};

export const Prefilled: Story = {
  args: { defaultValues: ["+420 601 234 567", "222 333 444"] },
};

/**
 * Adding and removing rows is the whole point of the component, so it is what
 * the test drives: three is the ceiling, one is the floor.
 */
export const AddsAndRemovesRows: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const addLabel = /přidat další číslo|add another number|weitere nummer hinzufügen/i;

    await userEvent.click(canvas.getByRole("button", { name: addLabel }));
    await userEvent.click(canvas.getByRole("button", { name: addLabel }));
    await expect(canvas.getAllByRole("textbox")).toHaveLength(3);

    // Three is the cap, so the control that would add a fourth is gone.
    await expect(canvas.queryByRole("button", { name: addLabel })).toBeNull();

    const removals = canvas.getAllByRole("button", { name: /odebrat|remove|entfernen/i });
    await userEvent.click(removals[0]!);
    await expect(canvas.getAllByRole("textbox")).toHaveLength(2);
  },
};

/** Removing a row must take its value with it, not shift it onto its neighbour. */
export const RemovingKeepsTheOtherValues: Story = {
  args: { defaultValues: ["601 111 111", "602 222 222", "603 333 333"] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const removals = canvas.getAllByRole("button", { name: /odebrat|remove|entfernen/i });
    await userEvent.click(removals[1]!);

    const remaining = canvas.getAllByRole("textbox") as HTMLInputElement[];
    await expect(remaining).toHaveLength(2);
    await expect(remaining[0]).toHaveValue("601 111 111");
    await expect(remaining[1]).toHaveValue("603 333 333");
  },
};

export const WithEntryError: Story = {
  args: {
    defaultValues: ["+420 601 234 567", "call me"],
    fields: { "phones.1": "IS_PHONE" },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const inputs = canvas.getAllByRole("textbox");

    // The offending input is the one marked, not the whole group.
    await expect(inputs[0]).not.toHaveAttribute("aria-invalid");
    await expect(inputs[1]).toHaveAttribute("aria-invalid", "true");
  },
};

export const WithListError: Story = {
  args: { fields: { phones: "ARRAY_MIN_SIZE" } },
};

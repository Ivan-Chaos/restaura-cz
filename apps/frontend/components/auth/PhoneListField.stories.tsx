import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { FormHarness } from "@/.storybook/form-harness";
import type { ProfileFormValues } from "@/lib/validation/schemas";

import { PhoneListField } from "./PhoneListField";

const PHONE_LABEL = /telefonní číslo|phone number|telefonnummer/i;
const REMOVE = /odebrat|remove|entfernen/i;
const ADD = /přidat další číslo|add another number|weitere nummer hinzufügen/i;

function values(phones: string[]): ProfileFormValues {
  return {
    restaurantName: "U Zlaté Lípy",
    phones: phones.length > 0 ? phones.map((value) => ({ value })) : [{ value: "" }],
    location: "Praha 2",
  };
}

function harness(phones: string[], errors?: Record<string, string>) {
  return function Decorator(Story: () => React.ReactElement) {
    return (
      <div className="w-full max-w-sm">
        <FormHarness defaultValues={values(phones)} errors={errors as never}>
          <Story />
        </FormHarness>
      </div>
    );
  };
}

const meta = {
  title: "Auth/PhoneListField",
  component: PhoneListField,
  parameters: { layout: "padded" },
  decorators: [harness([])],
} satisfies Meta<typeof PhoneListField>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One empty row, and no way to remove it: a profile needs a number. */
export const Empty: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getAllByLabelText(PHONE_LABEL)).toHaveLength(1);
    await expect(canvas.queryByRole("button", { name: REMOVE })).toBeNull();
  },
};

export const Prefilled: Story = {
  decorators: [harness(["+420 601 234 567", "+420 222 333 444"])],
};

/**
 * Adding and removing rows is the whole point of the component, so it is what
 * the test drives: three is the ceiling, one is the floor.
 */
export const AddsAndRemovesRows: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole("button", { name: ADD }));
    await userEvent.click(canvas.getByRole("button", { name: ADD }));
    await expect(canvas.getAllByLabelText(PHONE_LABEL)).toHaveLength(3);

    // Three is the cap, so the control that would add a fourth is gone.
    await expect(canvas.queryByRole("button", { name: ADD })).toBeNull();

    const removals = canvas.getAllByRole("button", { name: REMOVE });
    await userEvent.click(removals[0]!);
    await expect(canvas.getAllByLabelText(PHONE_LABEL)).toHaveLength(2);
  },
};

/**
 * Removing a row must take its value with it, not shift it onto its neighbour.
 * This is the reason the list is a `useFieldArray` rather than hand-rolled
 * state.
 */
export const RemovingKeepsTheOtherValues: Story = {
  decorators: [harness(["+420 601 111 111", "+420 602 222 222", "+420 603 333 333"])],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const removals = canvas.getAllByRole("button", { name: REMOVE });
    await userEvent.click(removals[1]!);

    const remaining = canvas.getAllByLabelText(PHONE_LABEL) as HTMLInputElement[];
    await expect(remaining).toHaveLength(2);
    await expect(remaining[0]).toHaveValue("601 111 111");
    await expect(remaining[1]).toHaveValue("603 333 333");
  },
};

export const WithEntryError: Story = {
  decorators: [
    harness(["+420 601 234 567", "call me"], { "phones.1.value": "IS_PHONE" }),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const inputs = canvas.getAllByLabelText(PHONE_LABEL);

    // The offending input is the one marked, not the whole group.
    await expect(inputs[0]).not.toHaveAttribute("aria-invalid");
    await expect(inputs[1]).toHaveAttribute("aria-invalid", "true");
  },
};

export const WithListError: Story = {
  decorators: [harness([], { phones: "ARRAY_MIN_SIZE" })],
};

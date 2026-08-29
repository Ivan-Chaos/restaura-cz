import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Textarea } from "./textarea";
import { Label } from "./label";

/**
 * Textarea is for free-form, potentially multi-line text — special
 * instructions for the kitchen, a delivery note, feedback on a visit. Use
 * `Input` instead for short, single-line values (a name, a table number). It
 * grows with its content rather than scrolling internally, so it's a poor
 * fit for a fixed-height layout slot. Always pair it with a visible `Label`.
 */
const meta = {
  title: "UI/Textarea",
  component: Textarea,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A free-form, multi-line text field — kitchen instructions, a delivery note, visit feedback. Use `Input` for short single-line values instead. It grows with its content rather than scrolling, so avoid it inside a fixed-height layout slot. Always pair with a visible `Label`.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex w-full max-w-sm flex-col gap-1.5">
      <Label htmlFor="kitchen-notes">Notes for the kitchen</Label>
      <Textarea
        id="kitchen-notes"
        placeholder="e.g. no coriander, allergic to peanuts"
      />
    </div>
  ),
};

export const WithValue: Story = {
  render: () => (
    <div className="flex w-full max-w-sm flex-col gap-1.5">
      <Label htmlFor="kitchen-notes-filled">Notes for the kitchen</Label>
      <Textarea
        id="kitchen-notes-filled"
        defaultValue="Please make the guláš mild, not spicy. Thank you!"
      />
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="flex w-full max-w-sm flex-col gap-1.5">
      <Label htmlFor="kitchen-notes-disabled">Notes for the kitchen</Label>
      <Textarea
        id="kitchen-notes-disabled"
        disabled
        placeholder="Not available for this order type"
      />
    </div>
  ),
};

export const Invalid: Story = {
  render: () => (
    <div className="flex w-full max-w-sm flex-col gap-1.5">
      <Label htmlFor="kitchen-notes-invalid">Notes for the kitchen</Label>
      <Textarea
        id="kitchen-notes-invalid"
        aria-invalid="true"
        defaultValue={"x".repeat(600)}
      />
      <p className="text-sm text-destructive">
        Notes must be 500 characters or fewer.
      </p>
    </div>
  ),
};

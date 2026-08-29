import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Label } from "./label";
import { Input } from "./input";
import { Checkbox } from "./checkbox";

/**
 * Label associates descriptive text with a form control so both sighted and
 * screen-reader guests know what a table-number field or a "no onions"
 * checkbox is for. Prefer wrapping the control in Label (or pointing
 * `htmlFor` at its `id`) over relying on a placeholder or adjacent plain
 * text, neither of which is programmatically associated. Most of the time
 * you'll reach for `FieldLabel` instead, which adds Field's spacing and
 * disabled/invalid state — use plain `Label` only outside of a `Field`.
 */
const meta = {
  title: "UI/Label",
  component: Label,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Associates text with a form control (an input, a checkbox) so the control has an accessible name. Point `htmlFor` at the control's `id`, or wrap the control directly. Inside a `Field`, prefer `FieldLabel` — it adds the field's spacing and disabled/invalid styling on top of this.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PairedWithInputViaHtmlFor: Story = {
  name: "Paired with an input (htmlFor)",
  render: () => (
    <div className="flex w-full max-w-sm flex-col gap-1.5">
      <Label htmlFor="guest-name">Name for the order</Label>
      <Input id="guest-name" placeholder="e.g. Jana" />
    </div>
  ),
};

export const WrappingACheckbox: Story = {
  name: "Wrapping a checkbox",
  render: () => (
    <Label className="items-start gap-2">
      <Checkbox id="no-onions" />
      No onions
    </Label>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="group flex w-full max-w-sm flex-col gap-1.5" data-disabled="true">
      <Label htmlFor="promo-code">Promo code</Label>
      <Input id="promo-code" disabled placeholder="Not available today" />
    </div>
  ),
};

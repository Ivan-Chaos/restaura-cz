import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Input } from "./input";
import { Label } from "./label";

/**
 * Input is a single-line text field — table number, guest name, promo code,
 * email for a receipt. Use `Textarea` instead for anything the guest might
 * write more than a short line of ("special instructions for the kitchen").
 * Every input needs a visible, associated `Label`; a `placeholder` alone is
 * not an accessible label and disappears the moment the guest starts typing.
 */
const meta = {
  title: "UI/Input",
  component: Input,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A single-line text field for short values: table number, guest name, promo code, receipt email. Use `Textarea` for anything longer, like kitchen notes. Always pair with a visible `Label` — a placeholder disappears the moment the guest types and is not an accessible name.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex w-full max-w-sm flex-col gap-1.5">
      <Label htmlFor="guest-name">Name for the order</Label>
      <Input id="guest-name" placeholder="e.g. Jana" />
    </div>
  ),
};

export const EmailType: Story = {
  name: "type=\"email\"",
  render: () => (
    <div className="flex w-full max-w-sm flex-col gap-1.5">
      <Label htmlFor="receipt-email">Email for receipt</Label>
      <Input id="receipt-email" type="email" placeholder="jana@example.com" />
    </div>
  ),
};

export const NumberType: Story = {
  name: "type=\"number\"",
  render: () => (
    <div className="flex w-full max-w-sm flex-col gap-1.5">
      <Label htmlFor="table-number">Table number</Label>
      <Input id="table-number" type="number" min={1} placeholder="12" />
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="flex w-full max-w-sm flex-col gap-1.5">
      <Label htmlFor="promo-code">Promo code</Label>
      <Input id="promo-code" disabled placeholder="Not available today" />
    </div>
  ),
};

export const Invalid: Story = {
  render: () => (
    <div className="flex w-full max-w-sm flex-col gap-1.5">
      <Label htmlFor="table-number-invalid">Table number</Label>
      <Input
        id="table-number-invalid"
        aria-invalid="true"
        defaultValue="abc"
      />
      <p className="text-sm text-destructive">
        Table number must contain only digits.
      </p>
    </div>
  ),
};

export const FileUpload: Story = {
  name: "type=\"file\"",
  render: () => (
    <div className="flex w-full max-w-sm flex-col gap-1.5">
      <Label htmlFor="menu-photo">Upload a photo for a special request</Label>
      <Input id="menu-photo" type="file" accept="image/*" />
    </div>
  ),
};

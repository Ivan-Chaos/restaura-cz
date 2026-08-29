import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "./field";
import { Input } from "./input";
import { Checkbox } from "./checkbox";
import { RadioGroup, RadioGroupItem } from "./radio-group";

/**
 * Field is the layout and state wrapper around a single form control —
 * table number, special instructions, delivery address — carrying its label,
 * helper text and validation error as one unit so they stay associated and
 * visually consistent. Use `FieldSet`/`FieldGroup`/`FieldLegend` to group
 * related fields (a delivery address block, a set of dietary checkboxes)
 * under one heading. Don't reach for Field when a control already has an
 * obvious, self-sufficient label context (a lone search box) — plain
 * `Label` + control is lighter there.
 */
const meta = {
  title: "UI/Field",
  component: Field,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "The layout and validation wrapper for one form control — order notes, table number, delivery address — keeping label, helper text and error together. Use `FieldSet`/`FieldGroup`/`FieldLegend` to group related fields under one heading. Skip it for a single, self-explanatory control where plain `Label` + input is enough.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Field className="w-full max-w-sm">
      <FieldLabel htmlFor="table-number">Table number</FieldLabel>
      <Input id="table-number" placeholder="e.g. 12" />
      <FieldDescription>Printed on the card on your table.</FieldDescription>
    </Field>
  ),
};

export const WithError: Story = {
  name: "Invalid (with error message)",
  render: () => (
    <Field data-invalid="true" className="w-full max-w-sm">
      <FieldLabel htmlFor="table-number-error">Table number</FieldLabel>
      <Input
        id="table-number-error"
        aria-invalid="true"
        defaultValue="abc"
      />
      <FieldError>Table number must contain only digits.</FieldError>
    </Field>
  ),
};

export const HorizontalCardField: Story = {
  name: "Horizontal orientation (option card)",
  render: () => (
    <FieldLabel className="w-full max-w-sm">
      <Field orientation="horizontal">
        <Checkbox id="gift-wrap" />
        <FieldContent>
          <FieldTitle>Gift wrap this order</FieldTitle>
          <FieldDescription>Adds 15 Kč to your total.</FieldDescription>
        </FieldContent>
      </Field>
    </FieldLabel>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Field data-disabled="true" className="w-full max-w-sm">
      <FieldLabel htmlFor="promo-code">Promo code</FieldLabel>
      <Input id="promo-code" disabled placeholder="Not available today" />
      <FieldDescription>Promo codes are disabled for this order type.</FieldDescription>
    </Field>
  ),
};

export const GroupedWithLegendAndSeparator: Story = {
  name: "FieldSet, FieldGroup and FieldSeparator",
  render: () => (
    <FieldSet className="w-full max-w-sm">
      <FieldLegend>Delivery method</FieldLegend>
      <FieldGroup>
        <Field>
          <RadioGroup defaultValue="pickup">
            <FieldLabel className="items-start gap-2">
              <RadioGroupItem value="pickup" />
              Pick up in the restaurant
            </FieldLabel>
            <FieldLabel className="items-start gap-2">
              <RadioGroupItem value="delivery" />
              Deliver to my address
            </FieldLabel>
          </RadioGroup>
        </Field>
        <FieldSeparator>or</FieldSeparator>
        <Field>
          <FieldLabel htmlFor="delivery-notes">
            Notes for the courier
          </FieldLabel>
          <Input id="delivery-notes" placeholder="e.g. gate code" />
        </Field>
      </FieldGroup>
    </FieldSet>
  ),
};

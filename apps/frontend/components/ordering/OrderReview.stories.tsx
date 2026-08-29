import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import type { LineItemModel, OrderSummaryModel } from "@/lib/design-system/ordering-types";

import { LineItem, type LineItemProps } from "./LineItem";
import { OrderSummary } from "./OrderSummary";
import { StickyActionBar, type StickyActionBarProps } from "./StickyActionBar";

/**
 * Shared story file: `LineItem`, `OrderSummary` and `StickyActionBar` are the
 * three pieces of a future order-review screen and are easiest to judge
 * together, so they share this story file instead of three near-empty ones.
 */

const pizzaLine: LineItemModel = {
  id: "line-pizza",
  item: { id: "pizza-margherita", name: "Margherita Pizza" },
  selectedOptions: [
    { groupName: "Size", optionName: "Large", priceDelta: { amount: 30, currency: "CZK" } },
    { groupName: "Extras", optionName: "Extra cheese", priceDelta: { amount: 20, currency: "CZK" } },
  ],
  quantity: 2,
  unitPrice: { amount: 219, currency: "CZK" },
  linePrice: { amount: 438, currency: "CZK" },
  note: "No onions please",
};

const lemonadeLine: LineItemModel = {
  id: "line-lemonade",
  item: { id: "lemonade", name: "Homemade Lemonade" },
  quantity: 1,
  unitPrice: { amount: 65, currency: "CZK" },
  linePrice: { amount: 65, currency: "CZK" },
};

const summary: OrderSummaryModel = {
  lines: [pizzaLine, lemonadeLine],
  subtotal: { amount: 503, currency: "CZK" },
  adjustments: [{ label: "Service charge", amount: { amount: 50, currency: "CZK" } }],
  total: { amount: 553, currency: "CZK" },
};

function ControlledLineItem(props: Omit<LineItemProps, "onQuantityChange" | "onRemove">) {
  const [line, setLine] = useState(props.line);
  return (
    <LineItem
      {...props}
      line={line}
      onQuantityChange={(next) => setLine((current) => ({ ...current, quantity: next }))}
      onRemove={() => {}}
    />
  );
}

function ControlledStickyActionBar(props: Omit<StickyActionBarProps, "onAction">) {
  return <StickyActionBar {...props} onAction={() => {}} />;
}

const meta = {
  title: "Ordering (future)/Order Review",
  component: OrderSummary,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Not shipped yet — a guest today never reaches a review step. `LineItem`, `OrderSummary` and `StickyActionBar` are reserved for a future ordering flow's confirmation screen.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof OrderSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Summary: Story = {
  args: { summary },
};

// `args: { summary }` below is an unused placeholder in every story that
// renders something other than the meta's `OrderSummary` — it exists only
// so `args` satisfies `OrderSummaryProps`, which is what this shared file's
// `meta.component` requires.

export const LineWithOptionsAndNote: Story = {
  name: "Line item (with options and note)",
  args: { summary },
  render: () => <ControlledLineItem line={pizzaLine} />,
};

export const LineReadOnly: Story = {
  name: "Line item (read-only, no buttons)",
  args: { summary },
  render: () => <LineItem line={pizzaLine} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("button")).toBeNull();
    await expect(canvas.queryByRole("spinbutton")).toBeNull();
  },
};

export const ActionBar: Story = {
  name: "Sticky action bar",
  args: { summary },
  render: () => (
    <ControlledStickyActionBar
      label="Place order"
      count={3}
      total={{ amount: 553, currency: "CZK" }}
    />
  ),
};

export const ActionBarDisabled: Story = {
  name: "Sticky action bar (disabled)",
  args: { summary },
  render: () => (
    <ControlledStickyActionBar label="Place order" count={0} disabled />
  ),
};

function KeyboardOperableActionBar() {
  const [triggered, setTriggered] = useState(false);
  return (
    <StickyActionBar
      label={triggered ? "Order placed" : "Place order"}
      count={3}
      total={{ amount: 553, currency: "CZK" }}
      onAction={() => setTriggered(true)}
    />
  );
}

export const ActionBarKeyboardOperable: Story = {
  name: "Sticky action bar (keyboard operable)",
  args: { summary },
  render: () => <KeyboardOperableActionBar />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: "Place order" });

    button.focus();
    await expect(button).toHaveFocus();
    await userEvent.keyboard("{Enter}");

    await expect(canvas.getByRole("button", { name: "Order placed" })).toBeInTheDocument();
  },
};

export const NarrowViewport: Story = {
  name: "Order review at 320px",
  globals: { viewport: { value: "mobile1" } },
  args: { summary },
  render: () => (
    <div className="flex flex-col gap-6">
      <OrderSummary summary={summary} />
      <ControlledStickyActionBar
        label="Place order"
        count={3}
        total={{ amount: 553, currency: "CZK" }}
      />
    </div>
  ),
};

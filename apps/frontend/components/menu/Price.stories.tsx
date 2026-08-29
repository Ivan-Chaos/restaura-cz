import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { PriceModel } from "@/lib/design-system/types";

import { Price } from "./Price";

/**
 * Renders any of the four ways a menu states a price. Locale is handled by
 * the toolbar — a Czech, English or German guest all see their own currency
 * formatting without a separate story for each.
 */
const meta = {
  title: "Menu/Price",
  component: Price,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Price>;

export default meta;
type Story = StoryObj<typeof meta>;

const single: PriceModel = { kind: "single", amount: { amount: 189, currency: "CZK" } };
const from: PriceModel = { kind: "from", amount: { amount: 149, currency: "CZK" } };
const market: PriceModel = { kind: "market" };
const variants: PriceModel = {
  kind: "variants",
  variants: [
    { label: "0.3 l", amount: { amount: 32, currency: "CZK" } },
    { label: "0.5 l", amount: { amount: 45, currency: "CZK" } },
  ],
};

export const Single: Story = { args: { price: single } };
export const From: Story = { args: { price: from } };
export const Market: Story = { args: { price: market } };
export const Variants: Story = { args: { price: variants } };

export const Sizes: Story = {
  args: { price: single },
  render: () => (
    <div className="flex flex-col items-start gap-3">
      <Price price={single} size="sm" />
      <Price price={single} size="md" />
      <Price price={single} size="lg" />
      <Price price={single} size="lg" emphasis />
    </div>
  ),
};

export const AllKinds: Story = {
  name: "All kinds × all sizes",
  args: { price: single },
  render: () => (
    <div className="grid grid-cols-4 items-baseline gap-x-8 gap-y-3 text-sm text-muted-foreground">
      <span />
      <span>sm</span>
      <span>md</span>
      <span>lg</span>

      <span className="self-center">single</span>
      <Price price={single} size="sm" />
      <Price price={single} size="md" />
      <Price price={single} size="lg" />

      <span className="self-center">from</span>
      <Price price={from} size="sm" />
      <Price price={from} size="md" />
      <Price price={from} size="lg" />

      <span className="self-center">market</span>
      <Price price={market} size="sm" />
      <Price price={market} size="md" />
      <Price price={market} size="lg" />

      <span className="self-center">variants</span>
      <Price price={variants} size="sm" />
      <Price price={variants} size="md" />
      <Price price={variants} size="lg" />
    </div>
  ),
};

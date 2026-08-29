import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { PriceVariant } from "@/lib/design-system/types";

import { PriceList } from "./PriceList";

const meta = {
  title: "Menu/PriceList",
  component: PriceList,
  parameters: { layout: "centered" },
} satisfies Meta<typeof PriceList>;

export default meta;
type Story = StoryObj<typeof meta>;

const variants: PriceVariant[] = [
  { label: "0.3 l", amount: { amount: 32, currency: "CZK" } },
  { label: "0.5 l", amount: { amount: 45, currency: "CZK" } },
];

const threeVariants: PriceVariant[] = [
  { label: "Half", amount: { amount: 189, currency: "CZK" } },
  { label: "Whole", amount: { amount: 349, currency: "CZK" } },
  { label: "Large portion", amount: { amount: 429, currency: "CZK" } },
];

export const Stacked: Story = {
  args: { variants: threeVariants, layout: "stacked" },
};

export const Inline: Story = {
  args: { variants, layout: "inline" },
};

export const OnADishCard: Story = {
  name: "Standalone on a dish card",
  args: { variants },
  render: () => (
    <div className="w-72 rounded-lg border border-border p-3">
      <p className="font-medium">Tank lager</p>
      <p className="mb-2 text-sm text-muted-foreground">Unpasteurised, poured from the tank</p>
      <PriceList variants={variants} layout="stacked" />
    </div>
  ),
};

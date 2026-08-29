import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LeafIcon, FlameIcon } from "lucide-react";

import { Badge } from "./badge";

/**
 * Badge is for a short, glanceable tag riding alongside other content — a
 * dietary label ("Vegan"), a spice-level marker, or a status word like "Sold
 * out" next to a dish name. It is not a button: it has no built-in press
 * affordance, so don't put a primary action inside one — use `Button` (or
 * `Toggle` for a filter chip) instead. Keep the label to a word or two; Badge
 * clips overflow rather than wrapping.
 */
const meta = {
  title: "UI/Badge",
  component: Badge,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A short, non-interactive tag for dish metadata: dietary labels, spice level, 'New', 'Sold out'. Not a button — it has no press affordance — and not for anything longer than a couple of words, since it clips rather than wraps.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="default">New</Badge>
      <Badge variant="secondary">Chef&apos;s pick</Badge>
      <Badge variant="destructive">Sold out</Badge>
      <Badge variant="outline">Vegan</Badge>
      <Badge variant="ghost">Gluten-free</Badge>
      <Badge variant="link" render={<a href="#allergens" />}>
        View allergens
      </Badge>
    </div>
  ),
};

export const WithIcon: Story = {
  name: "With leading/trailing icon",
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="outline">
        <LeafIcon data-icon="inline-start" />
        Vegan
      </Badge>
      <Badge variant="destructive">
        Spicy
        <FlameIcon data-icon="inline-end" />
      </Badge>
    </div>
  ),
};

export const OnDishCard: Story = {
  name: "Typical usage on a dish card",
  render: () => (
    <div className="flex w-full max-w-sm items-center justify-between rounded-lg border border-border p-3">
      <div>
        <p className="text-sm font-medium">Grilled seasonal vegetables</p>
        <p className="text-sm text-muted-foreground">
          With herb oil and toasted almonds
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        <Badge variant="outline">Vegan</Badge>
        <Badge variant="secondary">New</Badge>
      </div>
    </div>
  ),
};

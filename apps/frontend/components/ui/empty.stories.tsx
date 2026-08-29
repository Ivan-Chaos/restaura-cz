import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SearchXIcon, ShoppingCartIcon } from "lucide-react";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "./empty";
import { Button } from "./button";

/**
 * Empty is a placeholder for a section that genuinely has nothing to show —
 * an empty cart, a search with zero matches, a category with no dishes today.
 * Use it instead of leaving blank space so the guest understands *why*
 * nothing is there and what they can do next. Don't use it for a loading
 * state (that's `Skeleton`) or for a single missing field's error (that's
 * `FieldError`).
 */
const meta = {
  title: "UI/Empty",
  component: Empty,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A placeholder for a section with genuinely nothing to show — an empty cart, zero search matches, a category with nothing available today — explaining why and offering a next step. Not for a loading state (`Skeleton`) or a single field's validation error (`FieldError`).",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Empty>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EmptyCart: Story = {
  name: "Default (empty cart)",
  render: () => (
    <Empty className="w-full max-w-sm border border-dashed border-border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ShoppingCartIcon />
        </EmptyMedia>
        <EmptyTitle>Your order is empty</EmptyTitle>
        <EmptyDescription>
          Browse the menu and add a dish to get started.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="default">Browse menu</Button>
      </EmptyContent>
    </Empty>
  ),
};

export const NoSearchResults: Story = {
  render: () => (
    <Empty className="w-full max-w-sm border border-dashed border-border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchXIcon />
        </EmptyMedia>
        <EmptyTitle>No dishes match &quot;kangaroo&quot;</EmptyTitle>
        <EmptyDescription>
          Try a different search term, or clear your dietary filters.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline">Clear filters</Button>
      </EmptyContent>
    </Empty>
  ),
};

export const WithoutIcon: Story = {
  render: () => (
    <Empty className="w-full max-w-sm border border-dashed border-border">
      <EmptyHeader>
        <EmptyTitle>No desserts today</EmptyTitle>
        <EmptyDescription>
          The pastry section is closed on Mondays.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  ),
};

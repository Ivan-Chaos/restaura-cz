import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { useState } from "react";

import { Grid } from "@/components/layout/Grid";
import { DishCard } from "@/components/menu/DishCard";
import type { MenuItem } from "@/lib/design-system/types";

import { ReviewSelectionMock } from "./ReviewSelectionMock";
import { SelectableDishCard } from "./SelectableDishCard";

/**
 * The assembly test for the ordering vocabulary.
 *
 * These components are **not shipped**. The product is menus only; they exist so
 * a later revision can add ordering as an extension of the menu's visual
 * language rather than a second one. Nothing routable may import them.
 */
const meta = {
  title: "Ordering (future)/Review Selection (mock)",
  component: ReviewSelectionMock,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "NOT SHIPPED — documentation only. A complete 'review your selection' " +
          "screen composed entirely from existing tokens and primitives. If this " +
          "can be built with no new foundations, adding ordering later is a " +
          "state-and-routing problem rather than a design one.",
      },
    },
  },
} satisfies Meta<typeof ReviewSelectionMock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The narrowest supported viewport — the realistic case for a guest at a table. */
export const NarrowViewport: Story = {
  globals: { viewport: { value: "mobile1" } },
  play: async ({ canvasElement }) => {
    // Line items, the total and the persistent call to action must all remain
    // usable at 320px; a summary you have to scroll past to act on is broken.
    await expect(within(canvasElement).getByRole("heading", { level: 1 })).toBeVisible();

    const root = canvasElement.querySelector("[data-ordering]");
    await expect(root).not.toBeNull();
    await expect(root!.scrollWidth).toBeLessThanOrEqual(
      canvasElement.clientWidth + 1,
    );
  },
};

const DISH: MenuItem = {
  id: "svickova",
  name: "Svíčková na smetaně",
  description: "Krémová omáčka z kořenové zeleniny, houskové knedlíky, brusinky.",
  image: {
    src: "/sample-menu/svickova.svg",
    alt: "Svíčková na smetaně",
    width: 1200,
    height: 900,
  },
  price: { kind: "single", amount: { amount: 285, currency: "CZK" } },
  allergens: [1, 3, 7],
};

function SelectableDemo() {
  const [selected, setSelected] = useState(false);
  const [quantity, setQuantity] = useState(1);

  return (
    <SelectableDishCard
      item={DISH}
      selected={selected}
      quantity={quantity}
      onSelect={() => setSelected(true)}
      onQuantityChange={setQuantity}
    />
  );
}

/**
 * The FR-014c guarantee, made visible: a browsed dish and a selectable dish are
 * the same card. Only the action slot differs, and it is reserved in both so
 * selecting does not reflow the grid.
 */
export const IdenticalToBrowseCard: Story = {
  parameters: { layout: "padded" },
  render: () => (
    <div className="bg-background p-4">
      <Grid cols={{ base: 1, md: 2 }} gap={4}>
        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground text-xs">DishCard (shipped)</p>
          <DishCard item={DISH} />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground text-xs">
            SelectableDishCard (not shipped)
          </p>
          <SelectableDemo />
        </div>
      </Grid>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const cards = canvasElement.querySelectorAll('[data-slot="dish-card"]');
    await expect(cards).toHaveLength(2);

    // The selectable variant must be tagged so the e2e leak check can see it if
    // it ever reaches a route.
    await expect(cards[1].getAttribute("data-ordering")).not.toBeNull();
    await expect(cards[0].getAttribute("data-ordering")).toBeNull();
  },
};

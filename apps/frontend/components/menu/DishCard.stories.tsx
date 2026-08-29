import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { Grid } from "@/components/layout/Grid";
import type { MenuItem } from "@/lib/design-system/types";

import { DishCard } from "./DishCard";
import { DishRow } from "./DishRow";

/**
 * The unit of the menu. Every story below is a shape real restaurant data
 * actually takes — they are regression cases, not a gallery.
 */
const meta = {
  title: "Menu/DishCard",
  component: DishCard,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Use for food a guest chooses with their eyes. For long image-free " +
          "lists such as drinks, use `DishRow` instead — twenty cards is a " +
          "scroll marathon. Missing photo, missing description and missing " +
          "price are normal states, not error paths.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="bg-background w-80 max-w-full p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DishCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const base: MenuItem = {
  id: "svickova",
  name: "Svíčková na smetaně",
  description:
    "Krémová omáčka z kořenové zeleniny, houskové knedlíky, brusinky a lžíce šlehačky.",
  image: {
    src: "/sample-menu/svickova.svg",
    alt: "Svíčková na smetaně",
    width: 1200,
    height: 900,
  },
  price: { kind: "single", amount: { amount: 285, currency: "CZK" } },
  allergens: [1, 3, 7, 9],
  availability: "available",
};

export const Default: Story = { args: { item: base } };

/** No photo: the media block collapses rather than reserving empty space. */
export const WithoutImage: Story = {
  args: { item: { ...base, image: undefined } },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector("img")).toBeNull();
    await expect(within(canvasElement).getByRole("heading")).toBeVisible();
  },
};

/** No description: no gap where prose would have been. */
export const WithoutDescription: Story = {
  args: { item: { ...base, description: undefined } },
};

/** Sold out is dimmed *and* stated in words (spec FR-016). */
export const SoldOut: Story = {
  args: { item: { ...base, availability: "soldOut" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The state must survive with colour and opacity ignored.
    await expect(canvas.getByText(/Vyprodáno|Sold out|Ausverkauft/)).toBeVisible();
  },
};

export const Limited: Story = {
  args: { item: { ...base, availability: "limited" } },
};

/** Highlights and spice level, capped at two badges before it reads as clutter. */
export const HighlightedAndSpicy: Story = {
  args: {
    item: {
      ...base,
      highlights: ["chefsPick", "new", "popular"],
      spiceLevel: 2,
      dietary: ["vegetarian"],
    },
  },
};

/** Market price has no amount to show — it must still read as a price. */
export const MarketPrice: Story = {
  args: { item: { ...base, price: { kind: "market" }, image: undefined } },
};

/** "From" price, used when a dish is sold in half and whole portions. */
export const FromPrice: Story = {
  args: {
    item: { ...base, price: { kind: "from", amount: { amount: 329, currency: "CZK" } } },
  },
};

/** Variant prices: one dish, two portions. */
export const VariantPrices: Story = {
  args: {
    item: {
      ...base,
      image: undefined,
      price: {
        kind: "variants",
        variants: [
          { label: "Porce", amount: { amount: 249, currency: "CZK" } },
          { label: "Velká porce", amount: { amount: 329, currency: "CZK" } },
        ],
      },
    },
  },
};

/**
 * A genuinely long Czech dish name — 120+ characters. It must wrap, and the
 * card must not push the page sideways.
 */
export const VeryLongName: Story = {
  args: {
    item: {
      ...base,
      image: undefined,
      name: "Pečené vepřové koleno dušené na tmavém pivě s křenem, hořčicí a čerstvě strouhaným křenem podávané na dřevěném prkénku",
    },
  },
  globals: { viewport: { value: "mobile1" } },
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector('[data-slot="dish-card"]');
    await expect(card).not.toBeNull();
    const parent = card!.parentElement!;
    // Content must fit its container; overflow here becomes page-level
    // horizontal scroll on a phone.
    await expect(card!.scrollWidth).toBeLessThanOrEqual(parent.clientWidth + 1);
  },
};

/** An unbroken 120-character string — the pathological wrap case. */
export const UnbreakableName: Story = {
  args: {
    item: {
      ...base,
      image: undefined,
      name: "Bramborakovoveprovakolenospecialitasumaznikemakrenemazelimapivnimzavinacemsestistidobrousumavskoubramborovoukasi",
    },
  },
  globals: { viewport: { value: "mobile1" } },
};

/** Horizontal layout: a thumbnail beside the text, for denser sections. */
export const Horizontal: Story = {
  args: { item: base, layout: "horizontal" },
};

/** How a real category looks — mixed shapes side by side. */
export const InAGrid: Story = {
  args: { item: base },
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className="bg-background p-4">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <Grid cols={{ base: 1, md: 2 }} gap={4}>
      <DishCard item={base} />
      <DishCard item={{ ...base, image: undefined, description: undefined }} />
      <DishCard item={{ ...base, availability: "soldOut" }} />
      <DishCard
        item={{ ...base, image: undefined, price: { kind: "market" }, spiceLevel: 3 }}
      />
    </Grid>
  ),
};

/** The compact variant, for drinks and other image-free lists. */
export const RowVariant: Story = {
  args: { item: base },
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className="bg-background w-full max-w-2xl p-4">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <div>
      <DishRow
        item={{
          id: "pivo",
          name: "Tankový ležák",
          description: "Nepasterizovaný, čepovaný z tanku ve sklepě.",
          price: {
            kind: "variants",
            variants: [
              { label: "0,3 l", amount: { amount: 45, currency: "CZK" } },
              { label: "0,5 l", amount: { amount: 59, currency: "CZK" } },
            ],
          },
          allergens: [1],
        }}
      />
      <DishRow
        item={{
          id: "limonada",
          name: "Domácí limonáda",
          description: "Bezinka, máta a citron.",
          price: { kind: "single", amount: { amount: 85, currency: "CZK" } },
          dietary: ["vegan", "glutenFree"],
          highlights: ["new"],
        }}
      />
      <DishRow
        item={{
          id: "kava",
          name: "Espresso",
          price: { kind: "single", amount: { amount: 65, currency: "CZK" } },
          availability: "soldOut",
        }}
      />
    </div>
  ),
};

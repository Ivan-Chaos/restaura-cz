import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ScrollArea } from "./scroll-area";
import { Separator } from "./separator";

/**
 * ScrollArea gives a fixed-height region its own custom-styled scrollbar
 * instead of the browser's native one — a long allergen list inside a
 * dialog, a cart with many line items, a category list in a side panel. Use
 * it only when the surrounding layout genuinely needs to cap that region's
 * height; for the page itself, let the browser scroll natively rather than
 * wrapping the whole page in a ScrollArea.
 */
const meta = {
  title: "UI/ScrollArea",
  component: ScrollArea,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A fixed-height region with a custom scrollbar for content that must be capped — a long ingredient list inside a dialog, a cart with many line items. Don't wrap the whole page in it; let the browser handle page-level scrolling natively.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ScrollArea>;

export default meta;
type Story = StoryObj<typeof meta>;

const dishes = [
  "Svíčková na smetaně",
  "Hovězí guláš",
  "Kuřecí řízek",
  "Bramborák",
  "Smažený sýr",
  "Rajská omáčka",
  "Vepřo knedlo zelo",
  "Segedínský guláš",
  "Grilovaný losos",
  "Zeleninové rizoto",
  "Krkonošské zelí",
  "Slepičí polévka",
];

export const MenuList: Story = {
  name: "Default (menu category list)",
  render: () => (
    <ScrollArea className="h-64 w-full max-w-sm rounded-lg border border-border">
      <div className="flex flex-col p-3">
        {dishes.map((dish, index) => (
          <div key={dish}>
            {index > 0 && <Separator className="my-2" />}
            <p className="text-sm">{dish}</p>
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
};

export const HorizontalCategories: Story = {
  name: "Horizontal (category chips)",
  render: () => (
    <ScrollArea className="w-full max-w-sm rounded-lg border border-border">
      <div className="flex gap-2 p-3">
        {[
          "Starters",
          "Soups",
          "Main courses",
          "Salads",
          "Desserts",
          "Drinks",
          "Specials",
        ].map((category) => (
          <span
            key={category}
            className="shrink-0 rounded-full bg-muted px-3 py-1 text-sm whitespace-nowrap"
          >
            {category}
          </span>
        ))}
      </div>
    </ScrollArea>
  ),
};

import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Separator } from "./separator";

/**
 * Separator draws a thin dividing line between unrelated pieces of content —
 * between menu sections, between a dish's name/price and its description, or
 * between inline actions in a toolbar. It's purely visual; don't use it to
 * imply a heading or landmark structure (use `Section`/headings for that),
 * and don't reach for it just to add spacing — a `gap` utility on the parent
 * is the right tool when no visible line is wanted.
 */
const meta = {
  title: "UI/Separator",
  component: Separator,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A thin dividing line between unrelated content — between menu sections, or between a dish's details and its price. Purely visual: it doesn't create heading structure, and it's the wrong tool for plain spacing (use a `gap` utility on the parent for that).",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  name: "Default (horizontal, between sections)",
  render: () => (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <div>
        <p className="text-sm font-medium">Starters</p>
        <p className="text-sm text-muted-foreground">
          Soups and small plates
        </p>
      </div>
      <Separator />
      <div>
        <p className="text-sm font-medium">Main courses</p>
        <p className="text-sm text-muted-foreground">
          Slow-cooked classics
        </p>
      </div>
    </div>
  ),
};

export const Vertical: Story = {
  name: "Vertical (between inline actions)",
  render: () => (
    <div className="flex h-5 items-center gap-3 text-sm">
      <span>Edit order</span>
      <Separator orientation="vertical" />
      <span>Cancel order</span>
      <Separator orientation="vertical" />
      <span>Track order</span>
    </div>
  ),
};

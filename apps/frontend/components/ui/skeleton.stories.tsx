import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Skeleton } from "./skeleton";
import { Card, CardContent, CardHeader } from "./card";

/**
 * Skeleton is a loading placeholder that mirrors the shape of content still
 * being fetched — a dish card while the menu loads, a line of text while an
 * order total is calculated. It communicates nothing to assistive
 * technology on its own, so always wrap a group of skeletons in a container
 * with `role="status"` and an `aria-label` (e.g. "Loading menu") so
 * screen-reader guests know something is loading. Don't use Skeleton for a
 * state with genuinely no content — that's `Empty`.
 */
const meta = {
  title: "UI/Skeleton",
  component: Skeleton,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A loading placeholder shaped like the content still being fetched — a dish card, a line of text. It's purely visual, so wrap a group of skeletons in `role=\"status\"` with an `aria-label` so screen-reader guests know loading is in progress. Not for a state with genuinely nothing to show — that's `Empty`.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TextLines: Story = {
  name: "Default (text lines)",
  render: () => (
    <div
      role="status"
      aria-label="Loading dish description"
      className="flex w-full max-w-sm flex-col gap-2"
    >
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  ),
};

export const AvatarCircle: Story = {
  render: () => (
    <div role="status" aria-label="Loading profile">
      <Skeleton className="size-10 rounded-full" />
    </div>
  ),
};

export const DishCard: Story = {
  name: "Dish card while loading",
  render: () => (
    <Card
      role="status"
      aria-label="Loading dish"
      className="w-full max-w-sm"
    >
      <CardHeader>
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-full" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-16" />
      </CardContent>
    </Card>
  ),
};

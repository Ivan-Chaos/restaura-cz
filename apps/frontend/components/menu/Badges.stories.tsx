import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { Availability, Highlight } from "@/lib/design-system/types";

import { AvailabilityBadge } from "./AvailabilityBadge";
import { HighlightBadge } from "./HighlightBadge";

/**
 * `AvailabilityBadge` and `HighlightBadge` both ride alongside a dish name,
 * but answer different questions — can a guest still order this, versus is
 * it worth pointing out — so they never share a colour: availability uses
 * `success`/`warning`/`muted`, highlights always the `highlight` token.
 */
const meta = {
  title: "Menu/Badges",
  parameters: { layout: "centered" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const AVAILABILITY: Availability[] = ["available", "limited", "soldOut"];
const HIGHLIGHTS: Highlight[] = ["chefsPick", "new", "seasonal", "popular"];

export const AvailabilityStates: Story = {
  name: "Availability — every status",
  render: () => (
    <div className="flex flex-col gap-2">
      {AVAILABILITY.map((status) => (
        <div key={status} className="flex items-center gap-2">
          <AvailabilityBadge status={status} showAvailable />
          <span className="text-sm text-muted-foreground">status=&quot;{status}&quot;</span>
        </div>
      ))}
    </div>
  ),
};

export const AvailableHiddenByDefault: Story = {
  name: "available renders nothing unless showAvailable",
  render: () => (
    <div className="flex items-center gap-2 rounded-lg border border-border p-3">
      <span className="text-sm">Beef goulash</span>
      <AvailabilityBadge status="available" />
      <span className="text-xs text-muted-foreground">(nothing rendered here)</span>
    </div>
  ),
};

export const Highlights: Story = {
  name: "Highlights — every kind",
  render: () => (
    <div className="flex flex-wrap gap-2">
      {HIGHLIGHTS.map((kind) => (
        <HighlightBadge key={kind} kind={kind} />
      ))}
    </div>
  ),
};

export const OnADishName: Story = {
  name: "Typical usage next to a dish name",
  render: () => (
    <div className="flex w-80 items-center justify-between rounded-lg border border-border p-3">
      <div className="flex items-center gap-2">
        <span className="font-medium">Roast duck</span>
        <HighlightBadge kind="chefsPick" />
      </div>
      <AvailabilityBadge status="limited" />
    </div>
  ),
};

import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { Loader2Icon, PlusIcon, TrashIcon } from "lucide-react";

import { Button } from "./button";

/**
 * Button is the primary action affordance: "Add to order", "Place order",
 * "View cart". Use `variant="destructive"` for irreversible actions like
 * removing an item, `variant="ghost"`/`"outline"` for secondary actions
 * alongside a primary one, and `variant="link"` only for an action styled as
 * inline text. Don't use Button for navigation to a different page when a
 * plain `Link` reads better semantically, and don't use it for a
 * toggled/pressed state (dietary filter chips) — that's `Toggle`. This shadcn
 * style is built on `@base-ui/react`, so composition uses the `render` prop
 * (render-prop pattern) rather than Radix's `asChild`.
 */
const meta = {
  title: "UI/Button",
  component: Button,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "The primary call to action for ordering flows: 'Add to order', 'Place order', 'Checkout'. Use `destructive` for irreversible actions, `outline`/`ghost`/`secondary` for secondary actions beside a primary one, and `link` only for an action styled as inline text. Not for page navigation (prefer a real link) or a pressed/toggled state (use `Toggle`).",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="default">Add to order</Button>
      <Button variant="secondary">Save for later</Button>
      <Button variant="outline">View details</Button>
      <Button variant="ghost">Cancel</Button>
      <Button variant="destructive">Remove item</Button>
      <Button variant="link">View full menu</Button>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="xs">Add</Button>
      <Button size="sm">Add to order</Button>
      <Button size="default">Add to order</Button>
      <Button size="lg">Add to order</Button>
    </div>
  ),
};

export const IconOnly: Story = {
  name: "Icon-only (accessible name required)",
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="icon-xs" variant="ghost" aria-label="Remove item">
        <TrashIcon />
      </Button>
      <Button size="icon-sm" variant="outline" aria-label="Add one more">
        <PlusIcon />
      </Button>
      <Button size="icon" variant="secondary" aria-label="Add one more">
        <PlusIcon />
      </Button>
      <Button size="icon-lg" variant="default" aria-label="Add one more">
        <PlusIcon />
      </Button>
    </div>
  ),
};

export const WithIconAndLabel: Story = {
  name: "With leading icon",
  render: () => (
    <Button variant="default">
      <PlusIcon data-icon="inline-start" />
      Add to order
    </Button>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="default" disabled>
        Add to order
      </Button>
      <Button variant="outline" disabled>
        Sold out
      </Button>
    </div>
  ),
};

/**
 * Button has no built-in loading variant — compose it from a disabled button,
 * a spinning icon, and a status label so screen reader users hear that the
 * action is in progress rather than just "Place order".
 */
export const Loading: Story = {
  name: "Loading (composed, not a built-in variant)",
  render: () => (
    <Button variant="default" disabled aria-busy="true">
      <Loader2Icon data-icon="inline-start" className="animate-spin" />
      Placing order…
    </Button>
  ),
};

/**
 * `render` composes the button's styling and behavior onto another element —
 * here a real anchor — the base-ui equivalent of Radix `asChild`.
 */
export const RenderAsLink: Story = {
  name: "Composed via render prop (like a link)",
  render: () => (
    <Button variant="outline" render={<a href="#menu" />}>
      View full menu
    </Button>
  ),
};

export const ClickInteraction: Story = {
  render: () => <Button variant="default">Add to order</Button>,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: "Add to order" });

    await expect(button).toBeEnabled();
    await userEvent.click(button);
    await userEvent.tab();
  },
};

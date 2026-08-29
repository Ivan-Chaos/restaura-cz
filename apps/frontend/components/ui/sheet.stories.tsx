import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  expect,
  userEvent,
  waitFor,
  waitForElementToBeRemoved,
  within,
} from "storybook/test";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet";
import { Button } from "./button";

/**
 * Sheet is a panel that slides in from an edge of the screen for content the
 * guest works through alongside the menu — a running order/cart summary, a
 * filters panel (dietary needs, price range). Prefer it over `Dialog` when
 * the panel doesn't need to fully block the page, and over `Accordion` when
 * the content is a distinct task rather than optional detail attached to one
 * dish. Every sheet needs a `SheetTitle` for screen readers, even if it's
 * visually understated.
 */
const meta = {
  title: "UI/Sheet",
  component: Sheet,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "An edge-anchored panel for a task the guest works through alongside the menu — a running order/cart summary, a dietary-filters panel. Use over `Dialog` when the page shouldn't feel fully blocked, and over `Accordion` when the content is a distinct task rather than detail attached to one dish. Always include a `SheetTitle`.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Sheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CartFromRight: Story = {
  name: "Default (cart, from the right)",
  render: () => (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" />}>
        View order (3)
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Your order</SheetTitle>
          <SheetDescription>3 items · 615 Kč</SheetDescription>
        </SheetHeader>
        <SheetFooter>
          <SheetClose render={<Button variant="outline" />}>
            Keep browsing
          </SheetClose>
          <Button variant="default">Checkout</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
};

export const FiltersFromLeft: Story = {
  name: "Filters panel (from the left)",
  render: () => (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" />}>
        Filter dishes
      </SheetTrigger>
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>Dietary filters</SheetTitle>
          <SheetDescription>
            Narrow the menu to dishes that work for you.
          </SheetDescription>
        </SheetHeader>
        <SheetFooter>
          <Button variant="default">Apply filters</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
};

export const FromBottom: Story = {
  name: "From the bottom (mobile order summary)",
  render: () => (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" />}>
        View order (3)
      </SheetTrigger>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Your order</SheetTitle>
          <SheetDescription>3 items · 615 Kč</SheetDescription>
        </SheetHeader>
        <SheetFooter>
          <Button variant="default">Checkout</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
};

export const OpensAndCloses: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" />}>
        View order (3)
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Your order</SheetTitle>
          <SheetDescription>3 items · 615 Kč</SheetDescription>
        </SheetHeader>
        <SheetFooter>
          <SheetClose render={<Button variant="outline" />}>
            Keep browsing
          </SheetClose>
          <Button variant="default">Checkout</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    const trigger = canvas.getByRole("button", { name: "View order (3)" });
    await userEvent.click(trigger);

    // The panel is present in the portal as soon as it mounts, but it
    // slides/fades in over its transition duration — re-query and wait for
    // it to actually become visible rather than asserting on a stale
    // reference caught mid-animation.
    await waitFor(() => {
      expect(body.getByRole("heading", { name: "Your order" })).toBeVisible();
    });

    const closeButton = body.getByRole("button", { name: "Keep browsing" });
    await userEvent.click(closeButton);

    await waitForElementToBeRemoved(() =>
      body.queryByRole("heading", { name: "Your order" })
    );
  },
};

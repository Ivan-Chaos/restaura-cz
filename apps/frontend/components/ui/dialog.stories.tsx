import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  expect,
  userEvent,
  waitForElementToBeRemoved,
  within,
} from "storybook/test";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
import { Button } from "./button";

/**
 * Dialog interrupts the guest to confirm or collect something before they can
 * continue — confirming an order, confirming removal of a dish, entering a
 * table number. It is modal: it traps focus and blocks the rest of the page.
 * Don't use Dialog for content the guest should browse alongside without
 * losing their place (allergen detail while scrolling the menu) — that's what
 * `Accordion` or a non-modal `Sheet` are for. Every dialog needs a
 * `DialogTitle`; pair it with `DialogDescription` so both are announced
 * together.
 */
const meta = {
  title: "UI/Dialog",
  component: Dialog,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A modal interruption for something the guest must confirm before continuing — confirming an order, confirming removal of a dish. Traps focus and blocks the page behind it. Not for content the guest should browse alongside (use `Accordion` or a non-modal `Sheet` instead). Always pair with a `DialogTitle`.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ConfirmOrder: Story = {
  name: "Default (confirm order)",
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button variant="default" />}>
        Place order
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm your order</DialogTitle>
          <DialogDescription>
            3 items, total 615 Kč. This will be sent to the kitchen.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Keep editing
          </DialogClose>
          <Button variant="default">Confirm order</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const DestructiveConfirmation: Story = {
  name: "Destructive confirmation",
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button variant="destructive" />}>
        Remove item
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove Svíčková from your order?</DialogTitle>
          <DialogDescription>
            This can&apos;t be undone once the order is sent to the kitchen.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter showCloseButton>
          <Button variant="destructive">Remove</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const OpensFocusesAndClosesOnEscape: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button variant="default" />}>
        Place order
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm your order</DialogTitle>
          <DialogDescription>
            3 items, total 615 Kč. This will be sent to the kitchen.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Keep editing
          </DialogClose>
          <Button variant="default">Confirm order</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    const trigger = canvas.getByRole("button", { name: "Place order" });
    await userEvent.click(trigger);

    const heading = await body.findByRole("heading", {
      name: "Confirm your order",
    });
    await expect(heading).toBeVisible();

    const popup = heading.closest('[data-slot="dialog-content"]');
    await expect(popup).not.toBeNull();
    await expect(
      popup?.contains(canvasElement.ownerDocument.activeElement)
    ).toBe(true);

    await userEvent.keyboard("{Escape}");
    // The popup unmounts only after its close animation finishes, so wait
    // for removal instead of asserting immediately after the keypress.
    await waitForElementToBeRemoved(() =>
      body.queryByRole("heading", { name: "Confirm your order" })
    );
  },
};

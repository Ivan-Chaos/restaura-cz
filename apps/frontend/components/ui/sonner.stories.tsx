import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { toast } from "sonner";

import { Toaster } from "./sonner";
import { Button } from "./button";

/**
 * Toaster renders the stack of transient, non-blocking notifications
 * produced by calling `toast(...)` from `sonner` — "Added to order",
 * "Order sent to the kitchen", "Couldn't reach the server, try again".
 * Mount exactly one `Toaster` near the root of the app. Use a toast for
 * something that happened and doesn't need the guest's response; use
 * `Dialog` instead when the guest must confirm or decide something before
 * continuing.
 */
const meta = {
  title: "UI/Sonner",
  component: Toaster,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Renders the stack of transient notifications produced by calling `toast(...)`: 'Added to order', 'Order sent to the kitchen', a failed-request message. Mount one `Toaster` near the app root. Use it for something that already happened; use `Dialog` when the guest must confirm or decide something first.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {
  name: "Default (success toast)",
  render: () => (
    <div>
      <Toaster />
      <Button onClick={() => toast.success("Added to order")}>
        Add to order
      </Button>
    </div>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <Toaster />
      <Button
        variant="outline"
        onClick={() => toast.success("Order sent to the kitchen")}
      >
        Trigger success
      </Button>
      <Button
        variant="outline"
        onClick={() => toast.info("Your table is ready in 5 minutes")}
      >
        Trigger info
      </Button>
      <Button
        variant="outline"
        onClick={() => toast.warning("Only 2 portions of this dish left")}
      >
        Trigger warning
      </Button>
      <Button
        variant="outline"
        onClick={() => toast.error("Couldn't reach the kitchen, try again")}
      >
        Trigger error
      </Button>
      <Button
        variant="outline"
        onClick={() => toast.loading("Placing your order…")}
      >
        Trigger loading
      </Button>
    </div>
  ),
};

export const AppearsOnDemand: Story = {
  render: () => (
    <div>
      <Toaster />
      <Button onClick={() => toast.success("Added to order")}>
        Add to order
      </Button>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    await userEvent.click(canvas.getByRole("button", { name: "Add to order" }));

    // sonner mounts the toast, then flips it to its "visible" state a frame
    // later for the enter transition — re-query on each retry rather than
    // holding a reference that might be caught mid-mount/mid-animation.
    await waitFor(() => {
      expect(body.getByText("Added to order")).toBeVisible();
    });
  },
};

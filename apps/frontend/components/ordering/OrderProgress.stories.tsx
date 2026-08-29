import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { ORDER_STATUSES } from "@/lib/design-system/ordering-types";

import { ProgressStepper } from "./ProgressStepper";
import { OrderStatus } from "./OrderStatus";

/**
 * Shared story file: `ProgressStepper` and `OrderStatus` are both small,
 * read-only displays of "how far along is this order" and don't each
 * warrant a separate top-level Storybook page.
 */

const FIVE_STEPS = [
  { id: "received", label: "Received" },
  { id: "confirmed", label: "Confirmed" },
  { id: "preparing", label: "Preparing" },
  { id: "ready", label: "Ready" },
  { id: "served", label: "Served" },
];

const meta = {
  title: "Ordering (future)/Order Progress",
  component: ProgressStepper,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Not shipped yet — a guest today has no order to track. `ProgressStepper` and `OrderStatus` are reserved for a future ordering flow's tracking display and share this story file because neither is large enough to need its own.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ProgressStepper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ThreeSteps: Story = {
  args: {
    steps: FIVE_STEPS.slice(0, 3),
    currentId: "confirmed",
  },
};

export const FiveSteps: Story = {
  args: {
    steps: FIVE_STEPS,
    currentId: "preparing",
  },
};

export const NarrowViewport: Story = {
  name: "Five steps at 320px",
  globals: { viewport: { value: "mobile1" } },
  args: {
    steps: FIVE_STEPS,
    currentId: "preparing",
  },
};

export const CurrentStepIsAnnounced: Story = {
  args: {
    steps: FIVE_STEPS,
    currentId: "preparing",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const current = canvas.getByText("Preparing").closest("li");

    await expect(current).toHaveAttribute("aria-current", "step");
  },
};

// `steps`/`currentId` placeholders below: these stories render `OrderStatus`
// instead of the meta's `ProgressStepper`, but `args` still has to satisfy
// `ProgressStepperProps` since that's what this file's `meta.component` is.
const placeholderArgs = { steps: FIVE_STEPS, currentId: "preparing" };

export const AllStatuses: Story = {
  args: placeholderArgs,
  render: () => (
    <div className="flex flex-wrap gap-2">
      {ORDER_STATUSES.map((status) => (
        <OrderStatus key={status} status={status} />
      ))}
    </div>
  ),
};

export const ReceivedStatus: Story = {
  args: placeholderArgs,
  render: () => <OrderStatus status="received" />,
};

export const CancelledStatus: Story = {
  args: placeholderArgs,
  render: () => <OrderStatus status="cancelled" />,
};

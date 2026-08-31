import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { SidebarProvider } from "@/components/ui/sidebar";

import { DashboardHeader } from "./DashboardHeader";

const noop = async (): Promise<void> => {};

const meta = {
  title: "Dashboard/DashboardHeader",
  component: DashboardHeader,
  parameters: { layout: "fullscreen" },
  args: { email: "owner@example.com", locale: "cs", signOutAction: noop },
  decorators: [
    (Story) => (
      // The sidebar trigger reads the provider's context.
      <SidebarProvider>
        <div className="w-full">
          <Story />
        </div>
      </SidebarProvider>
    ),
  ],
} satisfies Meta<typeof DashboardHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByRole("button", { name: /odhlásit se|sign out|abmelden/i }),
    ).toBeVisible();
    await expect(canvas.getByText(/owner@example\.com/)).toBeVisible();
  },
};

/**
 * On a phone the address gives way, but the trigger and the way out must not:
 * losing navigation on a small screen would strand the owner.
 */
export const Narrow: Story = {
  globals: { viewport: { value: "mobile1" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByRole("button", { name: /odhlásit se|sign out|abmelden/i }),
    ).toBeVisible();
  },
};

export const WithALongAddress: Story = {
  args: { email: "objednavky.a.rezervace@u-zlate-lipy-restaurace.example.com" },
};

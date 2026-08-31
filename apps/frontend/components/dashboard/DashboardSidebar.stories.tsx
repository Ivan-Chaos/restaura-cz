import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { SidebarProvider } from "@/components/ui/sidebar";

import { DashboardSidebar } from "./DashboardSidebar";

const meta = {
  title: "Dashboard/DashboardSidebar",
  component: DashboardSidebar,
  parameters: {
    layout: "fullscreen",
    // The active entry is derived from the URL, so the stories set one.
    nextjs: { navigation: { pathname: "/workspace/menus" } },
  },
  args: { restaurantName: "U Zlaté Lípy" },
  decorators: [
    (Story) => (
      <SidebarProvider>
        <Story />
      </SidebarProvider>
    ),
  ],
} satisfies Meta<typeof DashboardSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OnMenus: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const menus = canvas.getByRole("link", { name: /menu|speisekarten/i });
    await expect(menus).toHaveAttribute("aria-current", "page");

    const settings = canvas.getByRole("link", { name: /nastavení|settings|einstellungen/i });
    await expect(settings).not.toHaveAttribute("aria-current");
  },
};

/** A settings tab is still Settings: the match is on the section, not the leaf. */
export const OnASettingsTab: Story = {
  parameters: {
    nextjs: { navigation: { pathname: "/workspace/settings/subscription" } },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const settings = canvas.getByRole("link", { name: /nastavení|settings|einstellungen/i });
    await expect(settings).toHaveAttribute("aria-current", "page");
  },
};

/** The menu editor is still Menus, for the same reason. */
export const OnTheMenuEditor: Story = {
  parameters: {
    nextjs: {
      navigation: { pathname: "/workspace/menus/8d1c0f52-1a2b-4c3d-9e8f-0a1b2c3d4e5f" },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const menus = canvas.getByRole("link", { name: /menu|speisekarten/i });
    await expect(menus).toHaveAttribute("aria-current", "page");
  },
};

export const WithALongRestaurantName: Story = {
  args: { restaurantName: "Restaurace U Zlaté Lípy a Slavnostních Příležitostí" },
};

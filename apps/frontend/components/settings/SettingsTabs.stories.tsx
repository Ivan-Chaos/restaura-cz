import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { SettingsTabs } from "./SettingsTabs";

const meta = {
  title: "Settings/SettingsTabs",
  component: SettingsTabs,
  parameters: {
    layout: "padded",
    nextjs: { navigation: { pathname: "/workspace/settings/profile" } },
  },
} satisfies Meta<typeof SettingsTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OnProfile: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByRole("link", { name: /restaurace|restaurant/i }),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      canvas.getByRole("link", { name: /předplatné|subscription|abonnement/i }),
    ).not.toHaveAttribute("aria-current");
  },
};

export const OnSubscription: Story = {
  parameters: {
    nextjs: { navigation: { pathname: "/workspace/settings/subscription" } },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByRole("link", { name: /předplatné|subscription|abonnement/i }),
    ).toHaveAttribute("aria-current", "page");
  },
};

/** Tabs are links inside a named landmark, so they are reachable by keyboard. */
export const IsNavigableByKeyboard: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const nav = canvas.getByRole("navigation");
    await expect(nav).toHaveAccessibleName();
    await expect(within(nav).getAllByRole("link")).toHaveLength(2);
  },
};

export const Narrow: Story = {
  globals: { viewport: { value: "mobile1" } },
};

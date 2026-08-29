import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

/**
 * Tabs switch between several equally-important views of the same page
 * without navigating away — menu categories (Starters/Mains/Desserts), or
 * "Current order" vs "Past orders". Use it when only one panel needs to be
 * visible at a time and guests will jump between them repeatedly. Don't use
 * Tabs for a linear, one-directional sequence like a checkout flow (use
 * numbered steps instead), and don't hide content a guest needs to compare
 * side by side behind a tab.
 */
const meta = {
  title: "UI/Tabs",
  component: Tabs,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Switches between equally-important views without leaving the page — menu categories, 'Current order' vs 'Past orders'. Use when guests will jump between panels repeatedly and only one needs to be visible. Not for a linear flow like checkout (use numbered steps) or content guests need to compare side by side.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MenuCategories: Story = {
  name: "Default",
  render: () => (
    <Tabs defaultValue="starters" className="w-full max-w-sm">
      <TabsList>
        <TabsTrigger value="starters">Starters</TabsTrigger>
        <TabsTrigger value="mains">Mains</TabsTrigger>
        <TabsTrigger value="desserts">Desserts</TabsTrigger>
      </TabsList>
      <TabsContent value="starters">
        <p className="text-sm">Soup of the day, bramborák, chlebíčky.</p>
      </TabsContent>
      <TabsContent value="mains">
        <p className="text-sm">Svíčková, guláš, grilled trout.</p>
      </TabsContent>
      <TabsContent value="desserts">
        <p className="text-sm">Palačinky, štrúdl, tiramisu.</p>
      </TabsContent>
    </Tabs>
  ),
};

export const LineVariant: Story = {
  name: "variant=\"line\"",
  render: () => (
    <Tabs defaultValue="current" className="w-full max-w-sm">
      <TabsList variant="line">
        <TabsTrigger value="current">Current order</TabsTrigger>
        <TabsTrigger value="past">Past orders</TabsTrigger>
      </TabsList>
      <TabsContent value="current">
        <p className="text-sm">3 items · being prepared</p>
      </TabsContent>
      <TabsContent value="past">
        <p className="text-sm">No previous orders yet.</p>
      </TabsContent>
    </Tabs>
  ),
};

export const VerticalOrientation: Story = {
  render: () => (
    <Tabs defaultValue="starters" orientation="vertical" className="w-full max-w-sm">
      <TabsList>
        <TabsTrigger value="starters">Starters</TabsTrigger>
        <TabsTrigger value="mains">Mains</TabsTrigger>
        <TabsTrigger value="desserts">Desserts</TabsTrigger>
      </TabsList>
      <TabsContent value="starters">
        <p className="text-sm">Soup of the day, bramborák, chlebíčky.</p>
      </TabsContent>
      <TabsContent value="mains">
        <p className="text-sm">Svíčková, guláš, grilled trout.</p>
      </TabsContent>
      <TabsContent value="desserts">
        <p className="text-sm">Palačinky, štrúdl, tiramisu.</p>
      </TabsContent>
    </Tabs>
  ),
};

export const DisabledTab: Story = {
  render: () => (
    <Tabs defaultValue="starters" className="w-full max-w-sm">
      <TabsList>
        <TabsTrigger value="starters">Starters</TabsTrigger>
        <TabsTrigger value="mains">Mains</TabsTrigger>
        <TabsTrigger value="desserts" disabled>
          Desserts (unavailable)
        </TabsTrigger>
      </TabsList>
      <TabsContent value="starters">
        <p className="text-sm">Soup of the day, bramborák, chlebíčky.</p>
      </TabsContent>
      <TabsContent value="mains">
        <p className="text-sm">Svíčková, guláš, grilled trout.</p>
      </TabsContent>
      <TabsContent value="desserts">
        <p className="text-sm">Kitchen closed for desserts today.</p>
      </TabsContent>
    </Tabs>
  ),
};

export const ArrowKeyNavigation: Story = {
  render: () => (
    <Tabs defaultValue="starters" className="w-full max-w-sm">
      <TabsList>
        <TabsTrigger value="starters">Starters</TabsTrigger>
        <TabsTrigger value="mains">Mains</TabsTrigger>
        <TabsTrigger value="desserts">Desserts</TabsTrigger>
      </TabsList>
      <TabsContent value="starters">
        <p className="text-sm">Soup of the day, bramborák, chlebíčky.</p>
      </TabsContent>
      <TabsContent value="mains">
        <p className="text-sm">Svíčková, guláš, grilled trout.</p>
      </TabsContent>
      <TabsContent value="desserts">
        <p className="text-sm">Palačinky, štrúdl, tiramisu.</p>
      </TabsContent>
    </Tabs>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const starters = canvas.getByRole("tab", { name: "Starters" });
    const mains = canvas.getByRole("tab", { name: "Mains" });
    const desserts = canvas.getByRole("tab", { name: "Desserts" });

    await expect(starters).toHaveAttribute("aria-selected", "true");

    // `TabsList` defaults to manual activation (`activateOnFocus={false}`,
    // the current APG-recommended pattern): arrow keys only move the roving
    // tabindex focus between tabs, they don't select one. Selecting the
    // focused tab takes an explicit Enter/Space press.
    starters.focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(mains).toHaveFocus();
    await expect(mains).toHaveAttribute("aria-selected", "false");
    await expect(starters).toHaveAttribute("aria-selected", "true");

    await userEvent.keyboard("{Enter}");
    await expect(mains).toHaveAttribute("aria-selected", "true");
    await expect(starters).toHaveAttribute("aria-selected", "false");
    await expect(
      canvas.getByText("Svíčková, guláš, grilled trout.")
    ).toBeVisible();

    await userEvent.keyboard("{ArrowRight}");
    await expect(desserts).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(desserts).toHaveAttribute("aria-selected", "true");

    await userEvent.keyboard("{ArrowLeft}");
    await expect(mains).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(mains).toHaveAttribute("aria-selected", "true");
  },
};

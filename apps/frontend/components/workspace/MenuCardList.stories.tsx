import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { Button } from "@/components/ui/button";
import type { MenuSummary } from "@/lib/api/types";

import { MenuCardList } from "./MenuCardList";

const noop = async (): Promise<void> => {};

const draft: MenuSummary = {
  id: "menu-1",
  name: "Polední menu",
  status: "draft",
  publicSlug: null,
  updatedAt: "2026-08-31T10:00:00.000Z",
};

const published: MenuSummary = {
  id: "menu-2",
  name: "Stálá nabídka",
  status: "published",
  publicSlug: "stala-nabidka-x7k2qf",
  updatedAt: "2026-08-30T10:00:00.000Z",
};

const meta = {
  title: "Workspace/MenuCardList",
  component: MenuCardList,
  parameters: { layout: "padded" },
  args: { locale: "cs", deleteAction: noop },
} satisfies Meta<typeof MenuCardList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: { menus: [], emptyAction: <Button>Vytvořit menu</Button> },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText(/zatím žádná menu|no menus yet|noch keine/i)).toBeVisible();
    // The empty state is only inviting if the way out of it is right there.
    await expect(canvas.getByRole("button", { name: "Vytvořit menu" })).toBeVisible();
  },
};

export const DraftOnly: Story = {
  args: { menus: [draft] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // The whole card is one link, named by the menu it opens.
    const link = canvas.getByRole("link", { name: "Polední menu" });
    await expect(link).toHaveAttribute("href", expect.stringContaining("/workspace/menus/menu-1"));
    await expect(canvas.getByText(/koncept|draft|entwurf/i)).toBeVisible();
  },
};

export const Mixed: Story = {
  args: { menus: [published, draft] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText("/m/stala-nabidka-x7k2qf")).toBeVisible();
    await expect(canvas.getAllByRole("link")).toHaveLength(2);
    // Deleting stays reachable per card, and separately focusable from the link.
    await expect(canvas.getAllByRole("button", { name: /smazat|delete|löschen/i })).toHaveLength(2);
  },
};

export const LongName: Story = {
  args: {
    menus: [
      { ...draft, name: "Polední menu pro podzimní sezónu a slavnostní příležitosti" },
      published,
    ],
  },
};

export const Narrow: Story = {
  globals: { viewport: { value: "mobile1" } },
  args: { menus: [published, draft] },
};

import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { MenuSummary } from "@/lib/api/types";

import { MenuList } from "./MenuList";

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
  title: "Workspace/MenuList",
  component: MenuList,
  parameters: { layout: "padded" },
  args: { locale: "cs", deleteAction: noop },
} satisfies Meta<typeof MenuList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: { menus: [] },
};

export const DraftOnly: Story = {
  args: { menus: [draft] },
};

export const Mixed: Story = {
  args: { menus: [published, draft] },
};

export const LongName: Story = {
  globals: { viewport: { value: "mobile1" } },
  args: {
    menus: [
      {
        ...draft,
        name: "Polední menu pro podzimní sezónu a slavnostní příležitosti",
      },
      published,
    ],
  },
};

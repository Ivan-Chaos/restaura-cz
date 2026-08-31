import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ConfirmDialog } from "./ConfirmDialog";

const noop = async (): Promise<void> => {};

const meta = {
  title: "Workspace/ConfirmDialog",
  component: ConfirmDialog,
  parameters: { layout: "centered" },
  args: {
    action: noop,
    hidden: { locale: "cs", menuId: "menu-1" },
    cancelLabel: "Zrušit",
  },
} satisfies Meta<typeof ConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DeleteMenu: Story = {
  args: {
    triggerLabel: "Smazat",
    title: "Smazat toto menu?",
    description:
      "Menu „Polední menu“ a celý jeho obsah bude odstraněn. Pokud je zveřejněné, jeho veřejná adresa přestane fungovat. Tuto akci nelze vrátit zpět.",
    confirmLabel: "Smazat menu",
  },
};

export const DeleteSection: Story = {
  args: {
    triggerLabel: "Smazat sekci",
    title: "Smazat tuto sekci?",
    description: "Sekce „Polévky“ a všechna jídla v ní budou odstraněna.",
    confirmLabel: "Smazat",
  },
};

export const DeleteDish: Story = {
  args: {
    triggerLabel: "Smazat jídlo",
    title: "Smazat toto jídlo?",
    description: "Jídlo „Kulajda“ bude z menu odstraněno.",
    confirmLabel: "Smazat",
  },
};

import { expect } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { FormState } from "@/lib/api/form-state";
import type { MenuItemView } from "@/lib/api/types";

import { ItemRow } from "./ItemRow";

const succeeds = async (): Promise<FormState> => ({ status: "success" });
const noop = async (): Promise<void> => {};

const item: MenuItemView = {
  id: "item-1",
  name: "Kulajda",
  description: "Se zastřeným vejcem a koprem",
  priceCzk: 89,
  position: 1,
  image: null,
};

const meta = {
  title: "Workspace/ItemRow",
  component: ItemRow,
  parameters: { layout: "padded" },
  // The row is an `li`, so it needs the list it belongs to.
  decorators: [(Story) => <ul>{Story()}</ul>],
  args: {
    item,
    hidden: { locale: "cs", menuId: "menu-1", sectionId: "section-1" },
    updateAction: succeeds,
    deleteAction: noop,
    duplicateAction: noop,
    moveAction: noop,
    isFirst: false,
    isLast: false,
  },
} satisfies Meta<typeof ItemRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ReadOnly: Story = {};

export const WithoutDescription: Story = {
  args: { item: { ...item, description: null } },
};

/** A price with hellers, formatted the way a guest will read it. */
export const PriceWithHellers: Story = {
  args: { item: { ...item, priceCzk: 56.5 } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/56,50/)).toBeVisible();
  },
};

/** The ends of the list cannot move further in that direction. */
export const FirstInSection: Story = {
  args: { isFirst: true, item: { ...item, position: 0 } },
};

export const OnlyItemInSection: Story = {
  args: { isFirst: true, isLast: true, item: { ...item, position: 0 } },
};

export const EditingInPlace: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Upravit" }));

    await expect(canvas.getByRole("textbox", { name: "Název jídla" })).toHaveValue("Kulajda");
    await expect(canvas.getByRole("textbox", { name: "Cena" })).toHaveValue("89");
  },
};

export const Narrow: Story = {
  globals: { viewport: { value: "mobile1" } },
};

/**
 * A photographed dish (feature 006). The thumbnail is the fastest way for an
 * owner to see which dishes they have already got round to.
 */
export const WithPhotograph: Story = {
  args: {
    item: {
      ...item,
      image: { url: "/sample-menu/svickova.svg", width: 1600, height: 1200 },
    },
  },
};

import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { FormState } from "@/lib/api/form-state";
import type { MenuSectionView } from "@/lib/api/types";

import { SectionEditor } from "./SectionEditor";

/**
 * A fresh object per call, not a shared constant: the hook notices a completed
 * submission on the pending edge, and a story that handed back the same object
 * twice would still be one submission as far as any identity check goes.
 */
const succeeds = async (): Promise<FormState> => ({ status: "success" });
const noop = async (): Promise<void> => {};

const filled: MenuSectionView = {
  id: "section-1",
  title: "Polévky",
  position: 0,
  items: [
    {
      id: "item-1",
      name: "Kulajda",
      description: "Se zastřeným vejcem a koprem",
      priceCzk: 89,
      position: 0,
      image: null,
      dietary: ["vegan"],
      allergens: [7],
      spiceLevel: 0,
      warnings: [],
      availability: "available",
    },
    {
      id: "item-2",
      name: "Hovězí vývar",
      description: null,
      priceCzk: 79,
      position: 1,
      image: null,
      dietary: [],
      allergens: [],
      spiceLevel: 0,
      warnings: [],
      // One dish off the menu tonight, so the editor shows what that looks like.
      availability: "hidden",
    },
  ],
};

const meta = {
  title: "Workspace/SectionEditor",
  component: SectionEditor,
  parameters: { layout: "padded" },
  args: {
    locale: "cs",
    menuId: "menu-1",
    isFirst: true,
    isLast: false,
    renameAction: succeeds,
    addItemAction: succeeds,
    updateItemAction: succeeds,
    moveSectionAction: noop,
    deleteSectionAction: noop,
    moveItemAction: noop,
    deleteItemAction: noop,
    duplicateItemAction: noop,
  },
} satisfies Meta<typeof SectionEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithItems: Story = {
  args: { section: filled },
};

export const EmptySection: Story = {
  args: { section: { id: "section-2", title: "Připravujeme", position: 1, items: [] } },
};

export const Narrow: Story = {
  globals: { viewport: { value: "mobile1" } },
  args: { section: filled },
};

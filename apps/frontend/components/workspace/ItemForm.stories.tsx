import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { FormState } from "@/lib/api/form-state";

import { ItemForm } from "./ItemForm";

const succeeds = async (): Promise<FormState> => ({ status: "idle" });

const meta = {
  title: "Workspace/ItemForm",
  component: ItemForm,
  parameters: { layout: "padded" },
  args: {
    action: succeeds,
    hidden: { locale: "cs", menuId: "menu-1", sectionId: "section-1" },
    idPrefix: "story",
    submitLabel: "Přidat jídlo",
  },
} satisfies Meta<typeof ItemForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AddDish: Story = {};

export const EditDish: Story = {
  args: {
    submitLabel: "Uložit",
    defaults: {
      name: "Kulajda",
      description: "Se zastřeným vejcem a koprem",
      priceCzk: "89",
    },
  },
};

export const Narrow: Story = {
  globals: { viewport: { value: "mobile1" } },
  args: {
    defaults: { name: "Kulajda", description: "", priceCzk: "89" },
  },
};

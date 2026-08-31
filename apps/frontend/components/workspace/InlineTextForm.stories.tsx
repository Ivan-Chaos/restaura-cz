import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { FormState } from "@/lib/api/form-state";

import { InlineTextForm } from "./InlineTextForm";

const succeeds = async (): Promise<FormState> => ({ status: "idle" });

const meta = {
  title: "Workspace/InlineTextForm",
  component: InlineTextForm,
  parameters: { layout: "padded" },
  args: {
    action: succeeds,
    field: "name",
    label: "Název menu",
    submitLabel: "Vytvořit menu",
    pendingLabel: "Ukládání…",
    hidden: { locale: "cs" },
  },
} satisfies Meta<typeof InlineTextForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CreateMenu: Story = {};

export const RenameWithValue: Story = {
  args: {
    defaultValue: "Polední menu",
    submitLabel: "Uložit název",
    hidden: { locale: "cs", menuId: "menu-1" },
  },
};

export const WithPlaceholder: Story = {
  args: { placeholder: "Předkrmy", label: "Název sekce", submitLabel: "Přidat sekci" },
};

export const LabelHidden: Story = {
  args: { labelHidden: true, placeholder: "Předkrmy" },
};

export const Narrow: Story = {
  globals: { viewport: { value: "mobile1" } },
  args: { defaultValue: "Polední menu" },
};

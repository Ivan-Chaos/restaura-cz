import { expect, waitFor } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { FormState } from "@/lib/api/form-state";

import { InlineTextForm } from "./InlineTextForm";

const succeeds = async (): Promise<FormState> => ({ status: "success" });

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

/** The form a rename opens over a heading: save, or leave it alone. */
export const WithCancel: Story = {
  args: {
    defaultValue: "Polévky",
    field: "title",
    label: "Název sekce",
    labelHidden: true,
    submitLabel: "Uložit",
    onCancel: () => {},
  },
};

/** Adding, rather than renaming: the field empties itself once it lands. */
export const ClearsAfterAdding: Story = {
  args: {
    placeholder: "Předkrmy",
    label: "Název nové sekce",
    submitLabel: "Přidat sekci",
    resetOnSuccess: true,
  },
  play: async ({ canvas, userEvent }) => {
    const input = canvas.getByRole("textbox", { name: "Název nové sekce" });
    await userEvent.type(input, "Polévky");
    await userEvent.click(canvas.getByRole("button", { name: "Přidat sekci" }));

    // The field empties itself when the write lands, a round trip after the
    // click — so this waits rather than asserting on the same tick.
    await waitFor(() => expect(input).toHaveValue(""));
  },
};

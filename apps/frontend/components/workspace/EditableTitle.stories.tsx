import { expect, waitFor } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { FormState } from "@/lib/api/form-state";

import { EditableTitle } from "./EditableTitle";

const succeeds = async (): Promise<FormState> => ({ status: "success" });
const rejects = async (): Promise<FormState> => ({
  status: "error",
  code: "VALIDATION_FAILED",
  fields: { title: "IS_LENGTH" },
});

const meta = {
  title: "Workspace/EditableTitle",
  component: EditableTitle,
  parameters: { layout: "padded" },
  args: {
    value: "Polévky",
    as: "h3",
    action: succeeds,
    field: "title",
    label: "Název sekce",
    renameLabel: "Přejmenovat",
    submitLabel: "Uložit",
    pendingLabel: "Ukládání…",
    hidden: { locale: "cs", menuId: "menu-1", sectionId: "section-1" },
    headingClassName: "text-lg font-medium",
  },
} satisfies Meta<typeof EditableTitle>;

export default meta;
type Story = StoryObj<typeof meta>;

/** How a section is read: a heading, not a form. */
export const Closed: Story = {};

export const MenuHeading: Story = {
  args: {
    value: "Polední menu",
    as: "h1",
    field: "name",
    label: "Název menu",
    renameLabel: "Přejmenovat menu",
    headingClassName: "text-2xl font-semibold tracking-tight",
  },
};

export const OpensOnRename: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Přejmenovat" }));

    const input = canvas.getByRole("textbox", { name: "Název sekce" });
    await expect(input).toHaveValue("Polévky");
    await expect(canvas.getByRole("button", { name: "Uložit" })).toBeVisible();
  },
};

export const CancelPutsTheHeadingBack: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Přejmenovat" }));
    await userEvent.click(canvas.getByRole("button", { name: "Zrušit" }));

    await expect(canvas.getByRole("heading", { name: "Polévky" })).toBeVisible();
  },
};

/** A rejected rename stays open, marked, with the edit still in the field. */
export const KeepsTheEditWhenRejected: Story = {
  args: { action: rejects },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Přejmenovat" }));

    const input = canvas.getByRole("textbox", { name: "Název sekce" });
    await userEvent.clear(input);
    await userEvent.type(input, "Polévky a předkrmy");
    await userEvent.click(canvas.getByRole("button", { name: "Uložit" }));

    await waitFor(() =>
      expect(canvas.getByText("Toto pole je povinné.")).toBeVisible(),
    );
    await expect(input).toHaveValue("Polévky a předkrmy");
  },
};

export const Narrow: Story = {
  globals: { viewport: { value: "mobile1" } },
};

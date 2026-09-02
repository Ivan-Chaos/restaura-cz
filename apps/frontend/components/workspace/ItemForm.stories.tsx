import { expect, waitFor } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { FormState } from "@/lib/api/form-state";

import { ItemForm } from "./ItemForm";

const succeeds = async (): Promise<FormState> => ({ status: "success" });

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

/**
 * The bug this form was rewritten for: a price the browser rejects used to take
 * the dish name with it, because React empties an uncontrolled form once its
 * action completes. Nothing is posted here at all — the schema catches it — and
 * what was typed is still on screen.
 */
export const RejectsAPriceAndKeepsWhatWasTyped: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByRole("textbox", { name: "Název jídla" }), "Kulajda");
    await userEvent.type(canvas.getByRole("textbox", { name: "Cena" }), "zdarma");
    await userEvent.click(canvas.getByRole("button", { name: "Přidat jídlo" }));

    // `waitFor`, because validation and the re-render it causes are a tick
    // away from the click, not part of it.
    await waitFor(() =>
      expect(canvas.getByText("Zadejte cenu, například 89 nebo 56,50.")).toBeVisible(),
    );
    await expect(canvas.getByRole("textbox", { name: "Název jídla" })).toHaveValue("Kulajda");
    await expect(canvas.getByRole("textbox", { name: "Cena" })).toHaveValue("zdarma");
  },
};

/**
 * Hellers are allowed, and a comma is how they are written here — so this is a
 * price, not a typo. The form emptying itself is the proof: that only happens
 * once the submission has been accepted.
 */
export const AcceptsHellers: Story = {
  play: async ({ canvas, userEvent }) => {
    const name = canvas.getByRole("textbox", { name: "Název jídla" });
    await userEvent.type(name, "Kulajda");
    await userEvent.type(canvas.getByRole("textbox", { name: "Cena" }), "56,50");
    await userEvent.click(canvas.getByRole("button", { name: "Přidat jídlo" }));

    await waitFor(() => expect(name).toHaveValue(""));
    await expect(
      canvas.queryByText("Zadejte cenu, například 89 nebo 56,50."),
    ).not.toBeInTheDocument();
  },
};

/** Adding a dish empties the form, ready for the next one. */
export const ClearsAfterAdding: Story = {
  play: async ({ canvas, userEvent }) => {
    const name = canvas.getByRole("textbox", { name: "Název jídla" });
    await userEvent.type(name, "Kulajda");
    await userEvent.type(canvas.getByRole("textbox", { name: "Cena" }), "89");
    await userEvent.click(canvas.getByRole("button", { name: "Přidat jídlo" }));

    // The form empties itself when the save lands, which is a round trip away.
    await waitFor(() => expect(name).toHaveValue(""));
  },
};

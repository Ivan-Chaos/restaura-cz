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
      dietary: ["vegetarian"],
      allergens: [3, 7],
      warnings: ["servedVeryHot"],
      spiceLevel: 1,
      availability: "limited",
    },
  },
};

/**
 * A dish taken off the menu for the evening (feature 008).
 *
 * It keeps everything — price, photograph, place in the section — and the only
 * thing that changes is that guests do not see it. That is the difference
 * between hiding and deleting, and it is why this is a field and not a button.
 */
export const HiddenDish: Story = {
  args: {
    submitLabel: "Uložit",
    defaults: {
      name: "Zelňačka",
      description: "",
      priceCzk: "59",
      availability: "hidden",
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

/**
 * Editing a dish that already has a photograph (feature 006). Replacing and
 * removing are both offered; neither does anything until the dish is saved,
 * which is what makes cancelling free.
 */
export const WithPhotograph: Story = {
  args: {
    hidden: { locale: "cs", menuId: "menu-1", sectionId: "section-1", itemId: "item-1" },
    submitLabel: "Uložit",
    defaults: { name: "Svíčková na smetaně", description: "", priceCzk: "245" },
    currentImage: {
      src: "/sample-menu/svickova.svg",
      alt: "Svíčková na smetaně",
      width: 1600,
      height: 1200,
    },
  },
};

/**
 * The declaration groups are checkboxes and radios, not buttons, so the form
 * carries what was ticked whether or not our JavaScript ever ran.
 *
 * This asserts the DOM rather than the submitted body on purpose: the browser
 * builds the body from exactly these inputs when it submits a form itself, so
 * proving the inputs are right proves the no-JavaScript path is right.
 */
export const DeclarationsPostAsRepeatedNames: Story = {
  args: {
    submitLabel: "Uložit",
    defaults: {
      name: "Tatarák",
      description: "",
      priceCzk: "245",
      dietary: ["glutenFree"],
      allergens: [3, 10],
      warnings: ["rawOrUndercooked"],
      spiceLevel: 2,
      availability: "soldOut",
    },
  },
  play: async ({ canvasElement }) => {
    const posted = new FormData();
    for (const input of canvasElement.querySelectorAll<HTMLInputElement>("input:checked")) {
      posted.append(input.name, input.value);
    }

    await expect(posted.getAll("dietary")).toEqual(["glutenFree"]);
    await expect(posted.getAll("allergens")).toEqual(["3", "10"]);
    await expect(posted.getAll("warnings")).toEqual(["rawOrUndercooked"]);
    // Radios: exactly one of each, always.
    await expect(posted.getAll("spiceLevel")).toEqual(["2"]);
    await expect(posted.getAll("availability")).toEqual(["soldOut"]);
  },
};

/**
 * Ticking an allergen and saving leaves the next dish a clean sheet.
 *
 * The declaration groups live outside react-hook-form, so `reset()` does not
 * reach them — without the explicit clear, every dish added after a fish soup
 * would quietly inherit its allergens, which is the worst possible field to get
 * wrong by carry-over.
 */
export const ClearsDeclarationsAfterAdding: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.type(canvas.getByRole("textbox", { name: "Název jídla" }), "Kulajda");
    await userEvent.type(canvas.getByRole("textbox", { name: "Cena" }), "89");

    const [firstAllergen] = canvasElement.querySelectorAll<HTMLInputElement>(
      'input[name="allergens"]',
    );
    await userEvent.click(firstAllergen!);
    await expect(firstAllergen).toBeChecked();

    await userEvent.click(canvas.getByRole("button", { name: "Přidat jídlo" }));

    await waitFor(() => expect(firstAllergen).not.toBeChecked());
  },
};

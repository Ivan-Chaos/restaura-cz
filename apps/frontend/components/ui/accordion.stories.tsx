import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./accordion";

/**
 * Accordion lets a guest reveal detail that would otherwise crowd a dish card:
 * allergen breakdowns, ingredient lists, a "how it's prepared" note. Use it for
 * secondary detail a guest opts into, not for anything needed to decide what to
 * order at a glance (price, sold-out state, portion size) — those belong on the
 * card itself. With fewer than roughly three items, a plain stacked list reads
 * faster than a click, so reserve Accordion for genuinely long or optional detail.
 */
const meta = {
  title: "UI/Accordion",
  component: Accordion,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Reveals optional dish detail (allergens, ingredients, preparation notes) without spending permanent space on the menu card. Not for anything a guest needs to decide what to order — keep price and availability visible outside the accordion. Skip it entirely for two or three short facts; a list is faster to scan than a click.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Accordion>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Accordion className="w-full max-w-sm" defaultValue={["allergens"]}>
      <AccordionItem value="allergens">
        <AccordionTrigger>Allergens</AccordionTrigger>
        <AccordionContent>
          Contains gluten, dairy and celery. Ask your server about
          substitutions.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="ingredients">
        <AccordionTrigger>Ingredients</AccordionTrigger>
        <AccordionContent>
          Slow-braised beef, root vegetable cream sauce, bread dumplings,
          lingonberries.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="pairing">
        <AccordionTrigger>Wine pairing</AccordionTrigger>
        <AccordionContent>
          A dry Moravian red complements the cream sauce well.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

export const MultipleOpen: Story = {
  name: "Multiple items open at once",
  render: () => (
    <Accordion
      className="w-full max-w-sm"
      defaultValue={["allergens", "ingredients"]}
    >
      <AccordionItem value="allergens">
        <AccordionTrigger>Allergens</AccordionTrigger>
        <AccordionContent>Contains nuts and soy.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="ingredients">
        <AccordionTrigger>Ingredients</AccordionTrigger>
        <AccordionContent>
          Grilled tofu, peanut sauce, jasmine rice, pickled vegetables.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

export const DisabledItem: Story = {
  render: () => (
    <Accordion className="w-full max-w-sm">
      <AccordionItem value="notes" disabled>
        <AccordionTrigger>Kitchen notes (unavailable today)</AccordionTrigger>
        <AccordionContent>Not published for this dish.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="allergens">
        <AccordionTrigger>Allergens</AccordionTrigger>
        <AccordionContent>Contains shellfish.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

export const TogglesOnClick: Story = {
  render: () => (
    <Accordion className="w-full max-w-sm">
      <AccordionItem value="allergens">
        <AccordionTrigger>Allergens</AccordionTrigger>
        <AccordionContent>Contains gluten and dairy.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="ingredients">
        <AccordionTrigger>Ingredients</AccordionTrigger>
        <AccordionContent>Potato, onion, sour cream.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("button", { name: "Allergens" });

    await expect(trigger).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(trigger);
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(canvas.getByText("Contains gluten and dairy.")).toBeVisible();

    await userEvent.click(trigger);
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  },
};

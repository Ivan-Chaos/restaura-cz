import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { Section } from "@/components/layout/Section";

import { CategoryNav } from "./CategoryNav";

const meta = {
  title: "Menu/CategoryNav",
  component: CategoryNav,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Sticky category strip for a long menu. Use it whenever a menu has " +
          "more than one category. It navigates to sections that are all " +
          "present in the document — it does not hide the others — so a guest " +
          "can still scroll the whole menu end to end.",
      },
    },
  },
} satisfies Meta<typeof CategoryNav>;

export default meta;
type Story = StoryObj<typeof meta>;

const CATEGORIES = [
  { id: "starters", name: "Předkrmy" },
  { id: "soups", name: "Polévky" },
  { id: "mains", name: "Hlavní jídla" },
  { id: "desserts", name: "Dezerty" },
  { id: "drinks", name: "Nápoje" },
];

export const Default: Story = {
  args: { categories: CATEGORIES, "aria-label": "Kategorie" },
};

/** Controlled: the parent decides which category reads as current. */
export const ActiveInTheMiddle: Story = {
  args: { categories: CATEGORIES, activeId: "mains", "aria-label": "Kategorie" },
  play: async ({ canvasElement }) => {
    const current = canvasElement.querySelector('[aria-current="true"]');
    await expect(current).not.toBeNull();
    await expect(current).toHaveTextContent("Hlavní jídla");
  },
};

/** A single category still renders sensibly rather than looking broken. */
export const SingleCategory: Story = {
  args: { categories: [CATEGORIES[0]], "aria-label": "Kategorie" },
};

/** Long German names must scroll horizontally, never push the page sideways. */
export const LongNames: Story = {
  args: {
    "aria-label": "Kategorien",
    categories: [
      { id: "starters", name: "Vorspeisen und kleine Gerichte" },
      { id: "mains", name: "Hauptgerichte vom Holzkohlegrill" },
      { id: "desserts", name: "Hausgemachte Desserts" },
      { id: "drinks", name: "Getränke und Tankbier" },
    ],
  },
  globals: { viewport: { value: "mobile1" } },
};

/** Arrow keys move between chips; Enter activates. */
export const KeyboardNavigation: Story = {
  args: { categories: CATEGORIES, "aria-label": "Kategorie" },
  render: (args) => (
    <div>
      <CategoryNav {...args} />
      {CATEGORIES.map((category) => (
        <Section key={category.id} id={category.id} title={category.name}>
          <p className="text-muted-foreground">Obsah kategorie {category.name}.</p>
        </Section>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const first = canvas.getByRole("link", { name: "Předkrmy" });

    first.focus();
    await expect(first).toHaveFocus();

    await userEvent.keyboard("{ArrowRight}");
    await expect(canvas.getByRole("link", { name: "Polévky" })).toHaveFocus();

    await userEvent.keyboard("{End}");
    await expect(canvas.getByRole("link", { name: "Nápoje" })).toHaveFocus();

    await userEvent.keyboard("{Home}");
    await expect(first).toHaveFocus();

    // Activating marks the category current for assistive technology.
    await userEvent.keyboard("{Enter}");
    await expect(first).toHaveAttribute("aria-current", "true");
  },
};

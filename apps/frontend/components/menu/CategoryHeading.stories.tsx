import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";

import { CategoryHeading } from "./CategoryHeading";

const meta = {
  title: "Menu/CategoryHeading",
  component: CategoryHeading,
  parameters: { layout: "padded" },
} satisfies Meta<typeof CategoryHeading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { name: "Hlavní jídla" },
};

export const WithDescription: Story = {
  args: {
    name: "Hlavní jídla",
    description: "Pomalu vařené klasiky, podávané s přílohou",
  },
};

export const WithCount: Story = {
  args: {
    name: "Hlavní jídla",
    description: "Pomalu vařené klasiky, podávané s přílohou",
    count: 8,
  },
};

/**
 * The five other styles (feature 005). The ordinal the numbered styles print
 * is `aria-hidden`, so the heading's name stays the category name.
 */
const withDescription = {
  name: "Hlavní jídla",
  description: "Pomalu vařené klasiky, podávané s přílohou",
  count: 8,
  index: 2,
} as const;

const named: Story["play"] = async ({ canvasElement }) => {
  const heading = canvasElement.querySelector("h2");
  await expect(heading).not.toBeNull();
  await expect(heading).toHaveAccessibleName("Hlavní jídla");
};

export const StyleCaps: Story = { args: { ...withDescription, style: "caps" }, play: named };
export const StyleGlass: Story = { args: { ...withDescription, style: "glass" }, play: named };
export const StyleBar: Story = { args: { ...withDescription, style: "bar" }, play: named };
export const StyleNumbered: Story = { args: { ...withDescription, style: "numbered" }, play: named };
export const StyleRoman: Story = { args: { ...withDescription, style: "roman" }, play: named };

export const LongName: Story = {
  globals: { viewport: { value: "mobile1" } },
  args: {
    name: "Speciality šéfkuchaře na objednávku pro dva a více hostů",
    description:
      "Připravujeme na počkání, počítejte prosím s delší dobou přípravy",
    count: 3,
  },
};

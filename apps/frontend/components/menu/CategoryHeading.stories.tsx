import type { Meta, StoryObj } from "@storybook/nextjs-vite";

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

export const LongName: Story = {
  globals: { viewport: { value: "mobile1" } },
  args: {
    name: "Speciality šéfkuchaře na objednávku pro dva a více hostů",
    description:
      "Připravujeme na počkání, počítejte prosím s delší dobou přípravy",
    count: 3,
  },
};

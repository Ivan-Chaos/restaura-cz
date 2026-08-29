import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { Establishment } from "@/lib/design-system/types";

import { MenuFooter } from "./MenuFooter";

const meta = {
  title: "Menu/MenuFooter",
  component: MenuFooter,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof MenuFooter>;

export default meta;
type Story = StoryObj<typeof meta>;

const full: Establishment = {
  name: "U Zlaté lžíce",
  contact: {
    address: "Nerudova 14, 118 00 Praha 1",
    phone: "+420 257 531 108",
    website: "uzlatelzice.cz",
  },
  serviceNotes: [
    "Ceny jsou uvedeny včetně DPH.",
    "Čísla alergenů odpovídají seznamu EU. Zeptejte se nás na cokoliv.",
    "Spropitné není zahrnuto v ceně.",
  ],
};

export const Full: Story = {
  args: { establishment: full },
};

export const Minimal: Story = {
  args: { establishment: { name: "U Zlaté lžíce" } },
};

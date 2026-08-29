import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { Establishment } from "@/lib/design-system/types";

import { MenuCover } from "./MenuCover";

const meta = {
  title: "Menu/MenuCover",
  component: MenuCover,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof MenuCover>;

export default meta;
type Story = StoryObj<typeof meta>;

const establishment: Establishment = {
  name: "U Zlaté lžíce",
  tagline: "Poctivá česká kuchyně od roku 1932",
  welcome: "Posaďte se, na nic nespěchejte. Vaříme na počkání.",
  logo: { src: "/file.svg", alt: "Logo restaurace U Zlaté lžíce", width: 64, height: 64 },
};

export const Default: Story = {
  args: { establishment, href: "/sample-menu" },
};

export const WithoutWelcomeNote: Story = {
  args: { establishment: { ...establishment, welcome: undefined }, href: "/sample-menu" },
};

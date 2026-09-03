import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { ThemeScope } from "@/components/theme/ThemeScope";
import type { MenuItem } from "@/lib/design-system/types";

import { DishRow } from "./DishRow";
import { MenuPanel } from "./MenuPanel";

/**
 * The category panel. Its whole job is to be invisible in most themes and a
 * frosted card in the translucent ones, with no change to what is inside.
 */
const meta = {
  title: "Menu/MenuPanel",
  component: MenuPanel,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Wraps one category's dishes. Paints nothing under themes whose " +
          "`--panel` is transparent; becomes a blurred, translucent card when a " +
          "theme sets the panel tokens. Blur is paid once here, never per dish.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="ambient bg-background w-96 max-w-full p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MenuPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

const items: MenuItem[] = [
  {
    id: "kulajda",
    name: "Kulajda",
    description: "Se zastřeným vejcem a koprem",
    price: { kind: "single", amount: { amount: 89, currency: "CZK" } },
  },
  {
    id: "svickova",
    name: "Svíčková na smetaně",
    price: { kind: "single", amount: { amount: 245, currency: "CZK" } },
    highlights: ["chefsPick"],
  },
  {
    id: "pivo",
    name: "Pilsner Urquell",
    price: {
      kind: "variants",
      variants: [
        { label: "0,3 l", amount: { amount: 45, currency: "CZK" } },
        { label: "0,5 l", amount: { amount: 59, currency: "CZK" } },
      ],
    },
  },
];

const rows = items.map((item) => <DishRow key={item.id} item={item} />);

/** Under the active toolbar theme. Warm and slate render no visible box. */
export const Default: Story = {
  args: { children: rows },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Kulajda")).toBeVisible();
    await expect(canvas.getByText("Svíčková na smetaně")).toBeVisible();
    await expect(canvasElement.querySelector('[data-slot="menu-panel"]')).not.toBeNull();
  },
};

/** Forced into Liquid Glass so the frosted treatment can be reviewed anywhere. */
export const LiquidGlass: Story = {
  args: { children: rows },
  decorators: [
    (Story) => (
      <ThemeScope theme="liquid-glass" className="ambient bg-background block rounded-xl p-6">
        <Story />
      </ThemeScope>
    ),
  ],
  play: async ({ canvasElement }) => {
    const panel = canvasElement.querySelector<HTMLElement>('[data-slot="menu-panel"]');
    await expect(panel).not.toBeNull();
    const styles = getComputedStyle(panel as HTMLElement);
    // The panel is translucent and blurred here, and only here. A fully
    // transparent background computes to an alpha of exactly 0; anything the
    // theme painted has some.
    await expect(styles.backgroundColor).not.toMatch(/[,/]\s*0\)$/);
    await expect(
      styles.backdropFilter || styles.getPropertyValue("-webkit-backdrop-filter"),
    ).toMatch(/blur/);
  },
};

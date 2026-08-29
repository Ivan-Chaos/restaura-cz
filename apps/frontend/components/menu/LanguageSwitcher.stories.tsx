import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { LanguageSelect } from "./LanguageSelect";
import { LanguageSwitcher } from "./LanguageSwitcher";

/**
 * Two components rather than one component with a `variant`, because the
 * dropdown pulls in the Select primitive (27 KB gzipped) and the guest menu
 * does not use it. Keeping them in separate modules keeps that weight off every
 * route. Use `LanguageSwitcher` on guest-facing pages and `LanguageSelect`
 * where space is tight.
 */
const meta = {
  title: "Menu/LanguageSwitcher",
  component: LanguageSwitcher,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Shows all three languages at once — one tap instead of two for a " +
          "guest holding a phone. Prefer this on the menu; use `LanguageSelect` " +
          "only where a row of buttons does not fit.",
      },
    },
  },
} satisfies Meta<typeof LanguageSwitcher>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Inline: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The active language must be conveyed to assistive tech, not by fill alone.
    const current = canvasElement.querySelector('[aria-current="true"]');
    await expect(current).not.toBeNull();
    await expect(canvas.getAllByRole("button")).toHaveLength(3);
  },
};

/** The compact variant, for dense screens. Lives in its own module. */
export const CompactSelect: Story = {
  render: () => <LanguageSelect />,
  play: async ({ canvasElement }) => {
    // The trigger must show the language name, never the raw locale code.
    await expect(canvasElement.textContent).not.toMatch(/^cs$/);
  },
};

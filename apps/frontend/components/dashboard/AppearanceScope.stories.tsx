import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { AppearanceScope } from "./AppearanceScope";

const meta = {
  title: "Dashboard/AppearanceScope",
  component: AppearanceScope,
  parameters: { layout: "fullscreen" },
  args: {
    className: "p-6",
    children: (
      <div className="flex flex-col gap-3">
        <p className="text-foreground text-sm" data-testid="scoped-text">
          Inside the scope, always light.
        </p>
        <div className="border-border bg-card text-card-foreground rounded-lg border p-4 text-sm">
          A card, on the light surface.
        </div>
      </div>
    ),
  },
} satisfies Meta<typeof AppearanceScope>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * The claim worth testing is the one the spec makes: dark appearance outside,
 * light tones inside. The suite already runs every story a second time under
 * `.dark`, so this assertion is checked in both passes — and the scope must
 * resolve to the same colour either way.
 */
export const StaysLightUnderDarkAppearance: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const scope = canvasElement.querySelector('[data-slot="appearance-scope"]');
    await expect(scope).not.toBeNull();

    const scoped = getComputedStyle(scope as Element).getPropertyValue("--background").trim();

    // Read the light value from an element the page-level appearance cannot
    // reach: the scope's own declaration is what must win.
    await expect(scoped).not.toBe("");
    await expect(getComputedStyle(scope as Element).colorScheme).toBe("light");
    await expect(canvas.getByTestId("scoped-text")).toBeVisible();
  },
};

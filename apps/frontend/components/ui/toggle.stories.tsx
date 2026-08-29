import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { LeafIcon } from "lucide-react";

import { Toggle } from "./toggle";

/**
 * Toggle is a two-state pressed/unpressed button, for a single filter or
 * view option that stays visible and clickable at all times — "Vegan only",
 * grid vs. list view. Use `Checkbox` instead inside a form that's submitted
 * together, and `RadioGroup`/`Tabs` instead of several Toggles standing in
 * for a one-of-many choice. An icon-only Toggle still needs an accessible
 * name via `aria-label`.
 */
const meta = {
  title: "UI/Toggle",
  component: Toggle,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A two-state pressed/unpressed button for a standalone filter or view option — 'Vegan only', grid vs. list view. Use `Checkbox` inside a form submitted together, and `RadioGroup`/`Tabs` for a one-of-many choice rather than several Toggles. Icon-only toggles still need `aria-label`.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const VeganFilter: Story = {
  name: "Default",
  render: () => <Toggle aria-label="Filter: vegan only">Vegan only</Toggle>,
};

export const Pressed: Story = {
  render: () => (
    <Toggle aria-label="Filter: vegan only" defaultPressed>
      Vegan only
    </Toggle>
  ),
};

export const OutlineVariant: Story = {
  name: "variant=\"outline\"",
  render: () => (
    <Toggle variant="outline" aria-label="Filter: gluten-free only">
      Gluten-free only
    </Toggle>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Toggle size="sm" aria-label="Filter: vegan only">
        Vegan
      </Toggle>
      <Toggle size="default" aria-label="Filter: vegan only">
        Vegan
      </Toggle>
      <Toggle size="lg" aria-label="Filter: vegan only">
        Vegan
      </Toggle>
    </div>
  ),
};

export const IconOnly: Story = {
  name: "Icon-only (accessible name required)",
  render: () => (
    <Toggle aria-label="Filter: vegan only">
      <LeafIcon />
    </Toggle>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Toggle aria-label="Filter: vegan only" disabled>
      Vegan only
    </Toggle>
  ),
};

export const KeyboardToggle: Story = {
  render: () => <Toggle aria-label="Filter: vegan only">Vegan only</Toggle>,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = canvas.getByRole("button", { name: "Filter: vegan only" });

    await expect(toggle).toHaveAttribute("aria-pressed", "false");

    toggle.focus();
    await userEvent.keyboard(" ");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");

    await userEvent.keyboard(" ");
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
  },
};

import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { Switch } from "./switch";
import { Label } from "./label";

/**
 * Switch is for a setting that takes effect immediately, with no separate
 * save/submit step — notifications on/off, dark mode, "show sold-out
 * dishes". Use `Checkbox` instead when the choice is part of a form that's
 * submitted together (order customization, agreeing to terms). Every switch
 * needs a visible label describing the setting it controls, stated so its
 * "on" state reads naturally (e.g. "Show sold-out dishes", not "Sold-out
 * dishes hidden").
 */
const meta = {
  title: "UI/Switch",
  component: Switch,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "An immediate-effect on/off setting — dark mode, notifications, 'show sold-out dishes' — with no separate save step. Use `Checkbox` instead for a choice that's part of a form submitted together, like order customization. Always label the setting so its 'on' state reads naturally.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {
  render: () => (
    <Label className="items-center gap-2">
      <Switch id="show-sold-out" />
      Show sold-out dishes
    </Label>
  ),
};

export const On: Story = {
  render: () => (
    <Label className="items-center gap-2">
      <Switch id="dark-mode" defaultChecked />
      Dark mode
    </Label>
  ),
};

export const Small: Story = {
  name: "size=\"sm\"",
  render: () => (
    <Label className="items-center gap-2">
      <Switch id="compact-menu" size="sm" />
      Compact menu layout
    </Label>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <Label className="items-center gap-2">
        <Switch id="disabled-off" disabled />
        Table service (unavailable for takeaway)
      </Label>
      <Label className="items-center gap-2">
        <Switch id="disabled-on" disabled defaultChecked />
        Allergen warnings
      </Label>
    </div>
  ),
};

export const KeyboardToggle: Story = {
  render: () => (
    <Label className="items-center gap-2">
      <Switch id="keyboard-demo" />
      Show sold-out dishes
    </Label>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = canvas.getByRole("switch", { name: "Show sold-out dishes" });

    await expect(toggle).toHaveAttribute("aria-checked", "false");

    toggle.focus();
    await userEvent.keyboard(" ");
    await expect(toggle).toHaveAttribute("aria-checked", "true");

    await userEvent.keyboard(" ");
    await expect(toggle).toHaveAttribute("aria-checked", "false");
  },
};

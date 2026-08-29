import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { InfoIcon } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";
import { Button } from "./button";

/**
 * Tooltip shows a short supplemental hint on hover or keyboard focus — what
 * an icon-only button does, an abbreviation's full meaning. It must never
 * carry information the guest needs to complete a task, because it doesn't
 * appear on touch devices at all: put anything essential (allergen warnings,
 * prices) in the visible layout instead. Wrap the app once in
 * `TooltipProvider`, not once per tooltip.
 */
const meta = {
  title: "UI/Tooltip",
  component: Tooltip,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A short hint shown on hover or keyboard focus — what an icon-only button does, an abbreviation spelled out. Never put essential information here: tooltips don't appear on touch devices, so allergen warnings and prices must live in the visible layout. Wrap the app once in `TooltipProvider`.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label="Allergen info" />
          }
        >
          <InfoIcon />
        </TooltipTrigger>
        <TooltipContent>Contains gluten and dairy</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};

export const Sides: Story = {
  render: () => (
    <TooltipProvider>
      <div className="flex items-center gap-6">
        {(["top", "right", "bottom", "left"] as const).map((side) => (
          <Tooltip key={side}>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label={`Info (${side})`}
                />
              }
            >
              <InfoIcon />
            </TooltipTrigger>
            <TooltipContent side={side}>Side: {side}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  ),
};

export const OnTextTrigger: Story = {
  name: "On a text trigger (not icon-only)",
  render: () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={<Button variant="link" />}>
          What does &quot;À la carte&quot; mean?
        </TooltipTrigger>
        <TooltipContent>
          Dishes ordered and priced individually, rather than as a fixed menu.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};

export const AppearsOnFocus: Story = {
  render: () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label="Allergen info" />
          }
        >
          <InfoIcon />
        </TooltipTrigger>
        <TooltipContent>Contains gluten and dairy</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    const trigger = canvas.getByRole("button", { name: "Allergen info" });
    trigger.focus();

    const tooltip = await body.findByText("Contains gluten and dairy");
    await expect(tooltip).toBeVisible();

    await userEvent.keyboard("{Escape}");
  },
};

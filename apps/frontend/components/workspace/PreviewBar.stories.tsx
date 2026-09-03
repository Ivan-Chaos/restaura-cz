import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";

import { SAVED, type FormState } from "@/lib/api/form-state";

import { PreviewBar } from "./PreviewBar";

/**
 * The strip above a style preview. The action is a spy so the story proves
 * exactly what "Use this style" posts.
 */
const meta = {
  title: "Workspace/PreviewBar",
  component: PreviewBar,
  parameters: { layout: "fullscreen" },
  args: {
    locale: "cs",
    menuId: "menu-1",
    variantId: "refined",
    styleName: "Vytříbený",
    isCurrent: false,
    action: fn(async (): Promise<FormState> => SAVED),
  },
} satisfies Meta<typeof PreviewBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("region")).toBeVisible();
    await expect(canvas.getByRole("link")).toBeVisible();

    await userEvent.click(canvas.getByRole("button"));
    await waitFor(() => expect(args.action).toHaveBeenCalled());
    const call = (args.action as ReturnType<typeof fn>).mock.calls[0] as [FormState, FormData];
    await expect(call[1].get("visualVariant")).toBe("refined");
    await expect(await canvas.findByRole("status")).toBeVisible();
  },
};

/** Previewing the style that is already saved: nothing to apply. */
export const Current: Story = {
  args: { isCurrent: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("button")).toBeDisabled();
  },
};

export const Error: Story = {
  args: {
    action: fn(async (): Promise<FormState> => ({ status: "error", code: "INTERNAL" })),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button"));
    await waitFor(() => expect(args.action).toHaveBeenCalled());
    await expect(await canvas.findByRole("alert")).toBeVisible();
  },
};

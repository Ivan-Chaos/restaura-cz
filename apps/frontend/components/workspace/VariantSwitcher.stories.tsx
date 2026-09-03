import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";

import { IDLE, SAVED, type FormState } from "@/lib/api/form-state";
import { VISUAL_VARIANTS } from "@/lib/menu-display/variants";

import { VariantSwitcher } from "./VariantSwitcher";

/**
 * The style picker. The action is a spy, so the stories prove what the form
 * posts without bundling a Server Action.
 */
const meta = {
  title: "Workspace/VariantSwitcher",
  component: VariantSwitcher,
  parameters: { layout: "padded" },
  args: {
    selected: "default",
    locale: "cs",
    menuId: "menu-1",
    action: fn(async (): Promise<FormState> => SAVED),
    previewBasePath: "/preview/menu-1",
  },
} satisfies Meta<typeof VariantSwitcher>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // Every catalogue entry is offered, and none is disabled or "coming soon".
    const radios = canvas.getAllByRole("radio");
    await expect(radios).toHaveLength(VISUAL_VARIANTS.length);
    for (const radio of radios) await expect(radio).toBeEnabled();
    await expect(radios[0]).toBeChecked();

    // Choosing a card posts that id, straight away.
    await userEvent.click(radios[VISUAL_VARIANTS.length - 1]);
    await waitFor(() => expect(args.action).toHaveBeenCalled());
    const call = (args.action as ReturnType<typeof fn>).mock.calls[0] as [FormState, FormData];
    await expect(call[1].get("visualVariant")).toBe("refined");
    await expect(call[1].get("menuId")).toBe("menu-1");
  },
};

export const GreenBarSelected: Story = {
  args: { selected: "green-bar" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const checked = canvas.getAllByRole("radio").filter((r) => (r as HTMLInputElement).checked);
    await expect(checked).toHaveLength(1);
    await expect((checked[0] as HTMLInputElement).value).toBe("green-bar");
  },
};

/** A stored value the catalogue no longer knows: nothing is checked, nothing breaks. */
export const UnknownStored: Story = {
  args: { selected: "retired-style" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const checked = canvas.getAllByRole("radio").filter((r) => (r as HTMLInputElement).checked);
    await expect(checked).toHaveLength(0);
  },
};

export const Error: Story = {
  args: {
    action: fn(async (): Promise<FormState> => ({ status: "error", code: "INTERNAL" })),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getAllByRole("radio")[2]);
    await waitFor(() => expect(args.action).toHaveBeenCalled());
    await expect(await canvas.findByRole("alert")).toBeVisible();
  },
};

export const WithoutPreviewLinks: Story = {
  args: { previewBasePath: undefined, action: fn(async (): Promise<FormState> => IDLE) },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryAllByRole("link")).toHaveLength(0);
  },
};

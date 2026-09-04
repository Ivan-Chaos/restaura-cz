import { expect, waitFor } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { SafeImage } from "./SafeImage";

/**
 * An image that falls back rather than breaking.
 *
 * A stored object can go missing — a half-completed delete, a lifecycle rule, a
 * bad deploy — and the browser's own answer to that is a broken-image icon,
 * which is the one thing a restaurant's menu must never show a guest. These
 * stories are the proof that the fallback, not the icon, is what appears.
 */
const meta = {
  title: "Menu/SafeImage",
  component: SafeImage,
  parameters: { layout: "centered" },
  args: {
    width: 240,
    height: 180,
    alt: "Svíčková na smetaně",
    fallback: <p data-slot="fallback">No photo available</p>,
  },
} satisfies Meta<typeof SafeImage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loads: Story = {
  args: { src: "/sample-menu/svickova.svg" },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("img", { name: "Svíčková na smetaně" })).toBeVisible();
    await expect(canvas.queryByText("No photo available")).toBeNull();
  },
};

export const FallsBackWhenMissing: Story = {
  args: { src: "/sample-menu/this-object-was-deleted.svg" },
  play: async ({ canvas }) => {
    await waitFor(async () => {
      await expect(canvas.getByText("No photo available")).toBeVisible();
    });
    // The point is not merely that the fallback appears, but that no broken
    // image is left on the page beside it.
    await expect(canvas.queryByRole("img")).toBeNull();
  },
};

/** A logo falls back to nothing at all: the restaurant's name stands alone. */
export const FallsBackToNothing: Story = {
  args: {
    src: "/sample-menu/this-object-was-deleted.svg",
    alt: "U Zlaté Lípy",
    fallback: null,
  },
  play: async ({ canvas }) => {
    await waitFor(async () => {
      await expect(canvas.queryByRole("img")).toBeNull();
    });
  },
};

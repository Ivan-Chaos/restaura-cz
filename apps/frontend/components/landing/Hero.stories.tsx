import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { getAsset, type MediaAsset } from "@/lib/landing/assets";

import { Hero } from "./Hero";

/**
 * The first screen. The stories that matter are the degraded ones: a hero that
 * only reads when its photograph arrives is a hero that does not read on the
 * connection this page is actually visited on.
 */
const meta = {
  title: "Landing/Hero",
  component: Hero,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Always renders the poster; the clip is optional and client-gated. " +
          "The scrim underneath is a token (`bg-overlay`), which is what keeps " +
          "the headline legible in both appearances and with no media at all.",
      },
    },
  },
} satisfies Meta<typeof Hero>;

export default meta;
type Story = StoryObj<typeof meta>;

const poster = getAsset("hero");
const clip = getAsset("heroClip");

/** A file that will 404 — the browser's own broken-image path, not a mock. */
const missing: MediaAsset = {
  ...poster,
  file: "landing/does-not-exist.jpg",
};

export const PosterOnly: Story = {
  args: { poster },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { level: 1 }),
    ).toBeInTheDocument();

    // Both calls to action must actually lead somewhere.
    for (const link of canvas.getAllByRole("link")) {
      await expect(link).toHaveAttribute("href");
      await expect(link.getAttribute("href")).not.toBe("#");
    }
  },
};

/**
 * With a clip declared. Whether a `<video>` appears is the browser's decision:
 * under reduced motion or reduced data it stays away entirely, which is why
 * this story asserts the headline rather than the element.
 */
export const WithClip: Story = {
  args: { poster, clip },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { level: 1 })).toBeVisible();
  },
};

/**
 * The requirement that matters most (FR-003): the offer is readable when the
 * media never arrives. The scrim is painted unconditionally, so it is.
 */
export const MediaFailed: Story = {
  args: { poster: missing },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(canvas.getAllByRole("link").length).toBeGreaterThan(0);
  },
};

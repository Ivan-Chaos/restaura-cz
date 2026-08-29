import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { ImageModel } from "@/lib/design-system/types";

import { DishImage } from "./DishImage";

/**
 * A dish photo at a fixed aspect ratio, or the warm placeholder every dish
 * without one gets. Sample photography is 1200×900 (4:3), matching the
 * default aspect — "1/1" and "16/9" force-crop it via `object-cover` so a
 * dish grid stays uniform regardless of the source photo's shape.
 */
const meta = {
  title: "Menu/DishImage",
  component: DishImage,
  parameters: { layout: "centered" },
} satisfies Meta<typeof DishImage>;

export default meta;
type Story = StoryObj<typeof meta>;

const svickova: ImageModel = {
  src: "/sample-menu/svickova.svg",
  alt: "Beef sirloin in cream sauce with bread dumplings",
  width: 1200,
  height: 900,
};

export const Default: Story = {
  args: { image: svickova },
  decorators: [(Story) => <div className="w-72"><Story /></div>],
};

export const Square: Story = {
  args: { image: svickova, aspect: "1/1" },
  decorators: [(Story) => <div className="w-56"><Story /></div>],
};

export const Widescreen: Story = {
  args: { image: svickova, aspect: "16/9" },
  decorators: [(Story) => <div className="w-96"><Story /></div>],
};

export const NoImage: Story = {
  name: "No image (placeholder)",
  args: { image: undefined },
  decorators: [(Story) => <div className="w-72"><Story /></div>],
};

export const NoImageSquare: Story = {
  name: "No image (placeholder, 1/1)",
  args: { image: undefined, aspect: "1/1" },
  decorators: [(Story) => <div className="w-56"><Story /></div>],
};

export const Priority: Story = {
  name: "Priority (above the fold)",
  args: { image: svickova, priority: true },
  decorators: [(Story) => <div className="w-72"><Story /></div>],
};

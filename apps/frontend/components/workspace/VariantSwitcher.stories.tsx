import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { VariantSwitcher } from "./VariantSwitcher";

const meta = {
  title: "Workspace/VariantSwitcher",
  component: VariantSwitcher,
  parameters: { layout: "padded" },
} satisfies Meta<typeof VariantSwitcher>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { selected: "default" },
};

export const Narrow: Story = {
  globals: { viewport: { value: "mobile1" } },
  args: { selected: "default" },
};

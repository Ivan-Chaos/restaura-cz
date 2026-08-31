import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { FormState } from "@/lib/api/form-state";

import { PublishControls } from "./PublishControls";

const succeeds = async (): Promise<FormState> => ({ status: "idle" });

const meta = {
  title: "Workspace/PublishControls",
  component: PublishControls,
  parameters: { layout: "padded" },
  args: {
    locale: "cs",
    menuId: "menu-1",
    publishAction: succeeds,
    unpublishAction: succeeds,
  },
} satisfies Meta<typeof PublishControls>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Draft: Story = {
  args: { status: "draft", publicUrl: null },
};

export const Published: Story = {
  args: {
    status: "published",
    publicUrl: "https://restaura.cz/cs/m/poledni-menu-x7k2qf",
  },
};

export const PublishedNarrow: Story = {
  globals: { viewport: { value: "mobile1" } },
  args: {
    status: "published",
    publicUrl: "https://restaura.cz/cs/m/poledni-menu-x7k2qf",
  },
};

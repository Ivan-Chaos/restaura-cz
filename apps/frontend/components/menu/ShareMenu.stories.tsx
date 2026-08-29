import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { Toaster } from "@/components/ui/sonner";

import { ShareMenu } from "./ShareMenu";

const meta = {
  title: "Menu/ShareMenu",
  component: ShareMenu,
  parameters: { layout: "centered" },
  // `toast()` needs a mounted <Toaster/> to render anything — the app tree
  // provides one in the root layout, so stories mount their own here.
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
        <Toaster />
      </div>
    ),
  ],
} satisfies Meta<typeof ShareMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

const url = "https://restaura.cz/cs/u-zlate-lzice";

export const Default: Story = {
  args: { url },
};

export const WithQrCode: Story = {
  args: {
    url,
    qr: (
      <div
        aria-hidden="true"
        className="size-32 rounded-md bg-muted"
      />
    ),
  },
};

/**
 * Pinned to English so the assertion can match real button/toast text rather
 * than guessing a translation. The clipboard write may or may not be granted
 * by the test browser — the component reports whichever actually happens, so
 * the assertion accepts either the success or the failure toast.
 */
export const CopyLink: Story = {
  args: { url },
  globals: { locale: "en" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /copy link/i }));

    const body = within(canvasElement.ownerDocument.body);
    const toast = await body.findByText(/link copied|could not copy the link/i);
    await expect(toast).toBeInTheDocument();
  },
};

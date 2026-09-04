import { expect, fn, waitFor, within } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import cs from "@/messages/cs.json";
import de from "@/messages/de.json";
import en from "@/messages/en.json";

import { ImageCropDialog } from "./ImageCropDialog";

/**
 * Where an owner decides what part of their image is shown.
 *
 * Nothing is uploaded from here: the dialog reports a rectangle in source
 * pixels and the file travels with it when the form is saved. That is what
 * makes cancelling free.
 *
 * Stories run in Czech and in German, so every name below is derived from the
 * catalogues rather than written out in one language.
 */
function inAnyLocale(pick: (messages: typeof en) => string): RegExp {
  const variants = [en, cs, de].map((messages) =>
    pick(messages as unknown as typeof en).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  return new RegExp(variants.join("|"), "i");
}

const TITLE_PHOTO = inAnyLocale((m) => m.ImageCrop.titlePhoto);
const TITLE_LOGO = inAnyLocale((m) => m.ImageCrop.titleLogo);
const ZOOM = inAnyLocale((m) => m.ImageCrop.zoom);
const CONFIRM = inAnyLocale((m) => m.ImageCrop.confirm);
const CANCEL = inAnyLocale((m) => m.ImageCrop.cancel);

/**
 * A real, decodable PNG, so the cropper has something with genuine dimensions
 * to measure. A hand-built byte array would load as a broken image and the
 * crop area would never be reported.
 */
async function pngFile(name = "dish.png"): Promise<File> {
  // A real asset from `public/`, so the cropper has genuine dimensions to
  // measure. Building one inline would mean writing literal colours into a
  // component file, and the pixels of a fixture photograph are not something a
  // theme has any business retuning.
  const response = await fetch("/sample-menu/svickova.svg");
  return new File([await response.blob()], name, { type: "image/svg+xml" });
}

const meta = {
  title: "Workspace/ImageCropDialog",
  component: ImageCropDialog,
  parameters: { layout: "centered" },
  args: {
    open: true,
    file: null,
    aspect: 4 / 3,
    kind: "dish",
    onConfirm: fn(),
    onCancel: fn(),
  },
  // Fetched once per story and handed in as a real File, the same shape the
  // file picker produces.
  loaders: [async () => ({ file: await pngFile() })],
  render: (args, { loaded }) => <ImageCropDialog {...args} file={loaded.file as File} />,
} satisfies Meta<typeof ImageCropDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DishPhoto: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);

    const heading = await body.findByRole("heading", { name: TITLE_PHOTO });
    await waitFor(async () => {
      await expect(heading).toBeVisible();
    });

    // The zoom control must carry an accessible name: Base UI renders the
    // focusable input inside its thumb, so an unlabelled slider is a control a
    // screen reader announces as nothing at all.
    await expect(body.getByRole("slider", { name: ZOOM })).toBeVisible();
    await expect(body.getByRole("button", { name: CONFIRM })).toBeVisible();
    await expect(body.getByRole("button", { name: CANCEL })).toBeVisible();
  },
};

export const Logo: Story = {
  args: { kind: "logo", aspect: 1 },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const heading = await body.findByRole("heading", { name: TITLE_LOGO });
    await waitFor(async () => {
      await expect(heading).toBeVisible();
    });
  },
};

/** Cancelling reports nothing, which is what leaves the stored image alone. */
export const Cancels: Story = {
  play: async ({ canvasElement, userEvent, args }) => {
    const body = within(canvasElement.ownerDocument.body);
    await body.findByRole("heading", { name: TITLE_PHOTO });

    await userEvent.click(body.getByRole("button", { name: CANCEL }));

    await expect(args.onCancel).toHaveBeenCalled();
    await expect(args.onConfirm).not.toHaveBeenCalled();
  },
};

/**
 * Confirming reports whole-pixel coordinates. The API extracts a pixel region,
 * so a fractional rectangle would be rejected as an unusable framing.
 */
export const ConfirmsWholePixels: Story = {
  play: async ({ canvasElement, userEvent, args }) => {
    const body = within(canvasElement.ownerDocument.body);
    await body.findByRole("heading", { name: TITLE_PHOTO });

    const confirm = body.getByRole("button", { name: CONFIRM });
    await waitFor(async () => {
      await expect(confirm).toBeEnabled();
    });
    await userEvent.click(confirm);

    await waitFor(async () => {
      await expect(args.onConfirm).toHaveBeenCalled();
    });

    const crop = (args.onConfirm as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]?.[0];
    await expect(Number.isInteger((crop as { x: number }).x)).toBe(true);
    await expect(Number.isInteger((crop as { width: number }).width)).toBe(true);
    await expect((crop as { width: number }).width).toBeGreaterThan(0);
  },
};

export const Closed: Story = {
  args: { open: false },
};

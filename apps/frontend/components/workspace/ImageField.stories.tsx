import { expect, fn, waitFor, within } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import cs from "@/messages/cs.json";
import de from "@/messages/de.json";
import en from "@/messages/en.json";
import type { ImageModel } from "@/lib/design-system/types";

import { ImageField } from "./ImageField";

/**
 * Choosing, framing, replacing and removing one image — the same control for a
 * restaurant's logo and for a dish's photograph.
 *
 * The stories that matter here are the refusals: a file the browser can tell is
 * not an image, and one that is simply too large, must both be reported without
 * anything being uploaded. That is what keeps a mistake free.
 *
 * Every story runs twice, in Czech and in German, so nothing here may match a
 * single language's prose. Names are built from the catalogues themselves,
 * which also means a reworded message cannot quietly stop being asserted.
 */

/** Matches one message key in whichever of the three languages is rendering. */
function inAnyLocale(pick: (messages: typeof en) => string): RegExp {
  const variants = [en, cs, de].map((messages) =>
    pick(messages as unknown as typeof en).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  return new RegExp(variants.join("|"), "i");
}

const ADD_PHOTO = inAnyLocale((m) => m.ImageField.addPhoto);
const UPLOAD_LOGO = inAnyLocale((m) => m.ImageField.uploadLogo);
const REPLACE_PHOTO = inAnyLocale((m) => m.ImageField.changePhoto);
const REMOVE_PHOTO = inAnyLocale((m) => m.ImageField.removePhoto);
const CROP_TITLE = inAnyLocale((m) => m.ImageCrop.titlePhoto);
const CROP_ZOOM = inAnyLocale((m) => m.ImageCrop.zoom);
const CROP_CANCEL = inAnyLocale((m) => m.ImageCrop.cancel);
const NOT_AN_IMAGE = inAnyLocale((m) => m.MenuEditor.fieldErrors.IS_IMAGE);
const TOO_LARGE = inAnyLocale((m) => m.MenuEditor.fieldErrors.MAX_FILE_SIZE);
const BAD_CROP = inAnyLocale((m) => m.MenuEditor.fieldErrors.IS_CROP);

const svickova: ImageModel = {
  src: "/sample-menu/svickova.svg",
  alt: "Svíčková na smetaně",
  width: 1200,
  height: 900,
};

/** Real bytes, so the byte-sniffing check has something honest to read. */
function pngFile(name = "logo.png"): File {
  const signature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return new File([signature, new Uint8Array(64)], name, { type: "image/png" });
}

/** Text under an image's name: what an owner produces by renaming a file. */
function notAnImage(): File {
  return new File([new TextEncoder().encode("plain text, not an image")], "logo.png", {
    type: "image/png",
  });
}

function oversized(): File {
  // Over the 10 MB cap. Zero-filled: size is checked before content, so the
  // bytes never matter.
  return new File([new Uint8Array(11 * 1024 * 1024)], "huge.jpg", { type: "image/jpeg" });
}

const meta = {
  title: "Workspace/ImageField",
  component: ImageField,
  parameters: { layout: "padded" },
  args: {
    kind: "dish",
    current: null,
    // Not a translated string: the label belongs to the host page, and keeping
    // it fixed gives the file input a stable name to be found by.
    label: "Fotka",
    previewAlt: "Svíčková na smetaně",
    idPrefix: "story-image",
    onChange: fn(),
  },
} satisfies Meta<typeof ImageField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EmptyDish: Story = {
  play: async ({ canvas }) => {
    // The empty state has to say what is accepted before anyone picks wrongly.
    await expect(canvas.getByRole("button", { name: ADD_PHOTO })).toBeVisible();
    await expect(canvas.getByText(/10 MB/)).toBeVisible();
  },
};

export const EmptyLogo: Story = {
  args: { kind: "logo", label: "Logo", previewAlt: "U Zlaté Lípy" },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: UPLOAD_LOGO })).toBeVisible();
  },
};

export const WithCurrentImage: Story = {
  args: { current: svickova },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("img", { name: "Svíčková na smetaně" })).toBeVisible();
    // With an image present the primary action becomes replacing it, and
    // removing becomes possible.
    await expect(canvas.getByRole("button", { name: REPLACE_PHOTO })).toBeVisible();
    await expect(canvas.getByRole("button", { name: REMOVE_PHOTO })).toBeVisible();
  },
};

export const WithCurrentLogo: Story = {
  args: {
    kind: "logo",
    label: "Logo",
    previewAlt: "U Zlaté Lípy",
    current: { src: "/sample-menu/svickova.svg", alt: "U Zlaté Lípy", width: 512, height: 512 },
  },
};

/**
 * The file is text with a `.png` name. The browser reads its leading bytes,
 * refuses it, and no upload is attempted.
 */
export const RejectsNonImage: Story = {
  play: async ({ canvas, userEvent, args }) => {
    const input = canvas.getByLabelText("Fotka", { selector: "input[type=file]" });
    await userEvent.upload(input, notAnImage());

    await waitFor(async () => {
      await expect(canvas.getByRole("alert")).toHaveTextContent(NOT_AN_IMAGE);
    });
    // Nothing was staged, so a save would carry no image.
    await expect(args.onChange).not.toHaveBeenCalled();
  },
};

export const RejectsOversized: Story = {
  play: async ({ canvas, userEvent, args }) => {
    const input = canvas.getByLabelText("Fotka", { selector: "input[type=file]" });
    await userEvent.upload(input, oversized());

    await waitFor(async () => {
      await expect(canvas.getByRole("alert")).toHaveTextContent(TOO_LARGE);
    });
    await expect(args.onChange).not.toHaveBeenCalled();
  },
};

/**
 * A valid file opens the framing step rather than saving straight away.
 *
 * The dialog is portalled to the document body, so it is looked for there
 * rather than inside the story's own canvas. It is dismissed at the end so it
 * cannot outlive this story.
 */
export const OpensCropDialog: Story = {
  play: async ({ canvasElement, canvas, userEvent }) => {
    const body = within(canvasElement.ownerDocument.body);

    const input = canvas.getByLabelText("Fotka", { selector: "input[type=file]" });
    await userEvent.upload(input, pngFile("dish.png"));

    // The crop tool is loaded on demand, so the first story to open it pays for
    // fetching the chunk. Under a full suite that can outlast the default
    // one-second wait, which says nothing about the component.
    const heading = await body.findByRole("heading", { name: CROP_TITLE }, { timeout: 10_000 });
    // The popup fades in, so it is briefly present at zero opacity. Waiting for
    // visibility rather than asserting it immediately is what keeps this from
    // depending on how fast the machine ran the animation.
    await waitFor(async () => {
      await expect(heading).toBeVisible();
    });
    // The zoom control has to be reachable and named, or the framing is
    // pointer-only.
    await expect(body.getByRole("slider", { name: CROP_ZOOM })).toBeVisible();

    // Cancelling unmounts the dialog outright rather than animating it out —
    // the field drops the chosen file, so there is nothing left to render.
    await userEvent.click(body.getByRole("button", { name: CROP_CANCEL }));
    await waitFor(async () => {
      await expect(body.queryByRole("heading", { name: CROP_TITLE })).toBeNull();
    });
  },
};

export const RemovesCurrentImage: Story = {
  args: { current: svickova },
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: REMOVE_PHOTO }));

    await expect(args.onChange).toHaveBeenCalledWith({ kind: "remove" });
    // The preview goes at once: the owner should see the consequence of the
    // press before they save, not after.
    await expect(canvas.queryByRole("img", { name: "Svíčková na smetaně" })).toBeNull();
  },
};

/** A rejection the API reported, rendered exactly like a local one. */
export const ServerRejectedImage: Story = {
  args: { error: "IS_CROP" },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("alert")).toHaveTextContent(BAD_CROP);
  },
};

export const Disabled: Story = {
  args: { current: svickova, disabled: true },
};

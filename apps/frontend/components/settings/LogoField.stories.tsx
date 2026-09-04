import { expect, fn, waitFor } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import cs from "@/messages/cs.json";
import de from "@/messages/de.json";
import en from "@/messages/en.json";
import type { FormState } from "@/lib/api/form-state";
import type { ImageRef } from "@/lib/api/types";

import { LogoField } from "./LogoField";

/**
 * The restaurant's logo on the settings page.
 *
 * What separates this from the dish photo beside it is *when* it saves:
 * confirming a framing here is the decision, so the upload starts at once
 * rather than waiting for a Save button. Removal asks first, because it is the
 * one action that destroys something with no later save to reconsider at.
 */
function inAnyLocale(pick: (messages: typeof en) => string): RegExp {
  const variants = [en, cs, de].map((messages) =>
    pick(messages as unknown as typeof en).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  return new RegExp(variants.join("|"), "i");
}

const UPLOAD_LOGO = inAnyLocale((m) => m.ImageField.uploadLogo);
const REPLACE_LOGO = inAnyLocale((m) => m.ImageField.changeLogo);
const REMOVE_LOGO = inAnyLocale((m) => m.Settings.removeLogoConfirm);
const REMOVE_TITLE = inAnyLocale((m) => m.Settings.removeLogoTitle);
const SECTION = inAnyLocale((m) => m.Settings.logoSection);

const logo: ImageRef = {
  url: "/sample-menu/svickova.svg",
  width: 512,
  height: 512,
};

const saves = async (): Promise<FormState> => ({ status: "success" });
const rejects = async (): Promise<FormState> => ({
  status: "error",
  code: "VALIDATION_FAILED",
  fields: { image: "IS_IMAGE" },
});
const removes = async (): Promise<void> => {};

const meta = {
  title: "Settings/LogoField",
  component: LogoField,
  parameters: { layout: "padded" },
  args: {
    logo: null,
    restaurantName: "U Zlaté Lípy",
    uploadAction: saves,
    removeAction: fn(removes),
    locale: "cs",
  },
} satisfies Meta<typeof LogoField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: SECTION })).toBeVisible();
    await expect(canvas.getByRole("button", { name: UPLOAD_LOGO })).toBeVisible();
    // With no logo there is nothing to remove, so the question is not offered.
    await expect(canvas.queryByRole("button", { name: REMOVE_LOGO })).toBeNull();
  },
};

export const WithLogo: Story = {
  args: { logo },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("img", { name: "U Zlaté Lípy" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: REPLACE_LOGO })).toBeVisible();
    await expect(canvas.getByRole("button", { name: REMOVE_LOGO })).toBeVisible();
  },
};

/** Removing asks first: the stored image is gone the moment it is confirmed. */
export const RemoveAsksFirst: Story = {
  args: { logo },
  play: async ({ canvasElement, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: REMOVE_LOGO }));

    const body = canvasElement.ownerDocument.body;
    await waitFor(async () => {
      await expect(body.textContent).toMatch(REMOVE_TITLE);
    });
  },
};

/**
 * A rejection from the API lands under the image field rather than in a toast:
 * it is something the owner has to act on, so it belongs beside the control
 * they will act on it with. The rendering of that error is asserted where it
 * lives, in `ImageField`'s own stories; this one exists so the composed page
 * can be looked at in both appearances.
 */
export const UploadRejected: Story = {
  args: { logo, uploadAction: rejects },
};

export const LongRestaurantName: Story = {
  args: {
    logo,
    restaurantName: "Restaurace U Zlaté Lípy na Náměstí Míru v Praze 2",
  },
};

import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import type { FormState } from "@/lib/api/form-state";
import type { RestaurantProfile } from "@/lib/api/types";

import { ProfileSettingsForm } from "./ProfileSettingsForm";

const profile: RestaurantProfile = {
  restaurantName: "U Zlaté Lípy",
  phones: ["+420 601 234 567"],
  location: "Náměstí Míru 12, 120 00 Praha 2",
  logo: null,
};

const saves = async (): Promise<FormState> => ({ status: "success" });
const rejects = async (): Promise<FormState> => ({
  status: "error",
  code: "VALIDATION_FAILED",
  fields: { restaurantName: "IS_LENGTH", phones: "ARRAY_MIN_SIZE" },
});

const meta = {
  title: "Settings/ProfileSettingsForm",
  component: ProfileSettingsForm,
  parameters: { layout: "padded" },
  args: { profile, locale: "cs", action: saves },
} satisfies Meta<typeof ProfileSettingsForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Prefilled from the stored profile — this is an edit, not a re-entry.
    await expect(
      canvas.getByLabelText(/název restaurace|restaurant name|name des restaurants/i),
    ).toHaveValue("U Zlaté Lípy");
  },
};

/** Saving keeps the owner where they are and says so. */
export const ReportsSuccess: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(
      canvas.getByRole("button", { name: /uložit změny|save changes|änderungen speichern/i }),
    );

    await expect(await canvas.findByRole("status")).toBeVisible();
  },
};

export const WithRejectedEdit: Story = {
  args: { action: rejects },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(
      canvas.getByRole("button", { name: /uložit změny|save changes|änderungen speichern/i }),
    );

    await expect(
      await canvas.findByText(/zadejte název restaurace|enter your restaurant|geben sie den namen/i),
    ).toBeVisible();
    // Nothing was reported as saved.
    await expect(canvas.queryByRole("status")).toBeNull();
  },
};

export const WithThreePhones: Story = {
  args: {
    profile: { ...profile, phones: ["601 111 222", "601 333 444", "601 555 666"] },
  },
};

export const Narrow: Story = {
  globals: { viewport: { value: "mobile1" } },
};

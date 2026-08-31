import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import type { FormState } from "@/lib/api/form-state";

import { RegistrationForm } from "./RegistrationForm";

const succeeds = async (): Promise<FormState> => ({ status: "idle" });
const emailTaken = async (): Promise<FormState> => ({ status: "error", code: "EMAIL_TAKEN" });
const invalidFields = async (): Promise<FormState> => ({
  status: "error",
  code: "VALIDATION_FAILED",
  fields: {
    email: "IS_EMAIL",
    password: "IS_LENGTH",
    restaurantName: "IS_LENGTH",
    phones: "ARRAY_MIN_SIZE",
    location: "IS_STRING",
  },
});

const meta = {
  title: "Auth/RegistrationForm",
  component: RegistrationForm,
  parameters: { layout: "padded" },
  args: { locale: "cs", action: succeeds },
  decorators: [
    (Story) => (
      <div className="mx-auto w-full max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RegistrationForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * The confirmation check is the form's own, so it must fire without the action
 * ever running — this is what a visitor sees while still typing.
 */
export const PasswordMismatch: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText(/^(heslo|password|passwort)$/i), "correct horse");
    await userEvent.type(
      canvas.getByLabelText(/potvrzení hesla|confirm password|passwort bestätigen/i),
      "different horse",
    );
    // Blur commits the comparison.
    await userEvent.tab();

    await expect(
      canvas.getByLabelText(/potvrzení hesla|confirm password|passwort bestätigen/i),
    ).toHaveAttribute("aria-invalid", "true");
  },
};

/** A matching pair must leave no error behind. */
export const PasswordsMatch: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const confirm = canvas.getByLabelText(
      /potvrzení hesla|confirm password|passwort bestätigen/i,
    );

    await userEvent.type(canvas.getByLabelText(/^(heslo|password|passwort)$/i), "correct horse");
    await userEvent.type(confirm, "correct horse");
    await userEvent.tab();

    await expect(confirm).not.toHaveAttribute("aria-invalid");
  },
};

export const WithTakenEmail: Story = {
  args: { action: emailTaken },
};

/** Every failing field is marked, so no submission fails without an explanation. */
export const WithInvalidFields: Story = {
  args: { action: invalidFields },
};

export const Narrow: Story = {
  globals: { viewport: { value: "mobile1" } },
};

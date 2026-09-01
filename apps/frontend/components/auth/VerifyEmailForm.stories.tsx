import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import type { FormState } from "@/lib/api/form-state";

import { VerifyEmailForm } from "./VerifyEmailForm";

const succeeds = async (): Promise<FormState> => ({ status: "idle" });
const resent = async (): Promise<FormState> => ({ status: "success" });
const wrongCode = async (): Promise<FormState> => ({ status: "error", code: "CODE_INVALID" });
const expiredCode = async (): Promise<FormState> => ({ status: "error", code: "CODE_EXPIRED" });
const exhausted = async (): Promise<FormState> => ({
  status: "error",
  code: "TOO_MANY_ATTEMPTS",
});
const signOut = async (): Promise<void> => {};

const meta = {
  title: "Auth/VerifyEmailForm",
  component: VerifyEmailForm,
  parameters: { layout: "padded" },
  args: {
    locale: "cs",
    email: "owner@example.com",
    action: succeeds,
    resendAction: resent,
    signOutAction: signOut,
  },
  decorators: [
    (Story) => (
      <div className="mx-auto w-full max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof VerifyEmailForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * The resend button starts disabled, because a code was just sent — by
 * registering, or by the resend that produced this state.
 */
export const ResendOnCooldown: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const resend = canvas.getByRole("button", {
      name: /poslat znovu za|resend in|erneut senden in/i,
    });
    await expect(resend).toBeDisabled();
  },
};

/** Six digits fill six slots, so the owner can check them against the email. */
export const CodeEntered: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText(/potvrzovací kód|confirmation code|bestätigungscode/i);

    await userEvent.type(input, "123456");
    await expect(input).toHaveValue("123456");
  },
};

/**
 * A malformed code is caught in the browser, so the field is marked without the
 * action ever running.
 */
export const TooFewDigits: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText(/potvrzovací kód|confirmation code|bestätigungscode/i);

    await userEvent.type(input, "123");
    await userEvent.click(
      canvas.getByRole("button", { name: /potvrdit e-mail|confirm email|e-mail bestätigen/i }),
    );

    await expect(input).toHaveAttribute("aria-invalid", "true");
  },
};

/** Wrong, expired and exhausted are reported at form level, not under the input. */
export const WrongCode: Story = { args: { action: wrongCode } };

export const ExpiredCode: Story = { args: { action: expiredCode } };

export const AttemptsExhausted: Story = { args: { action: exhausted } };

/** A failed resend has to say so: the owner pressed a button to receive an email. */
export const ResendFailed: Story = {
  args: {
    resendAction: async (): Promise<FormState> => ({ status: "error", code: "TOO_MANY_ATTEMPTS" }),
  },
};

export const Narrow: Story = {
  globals: { viewport: { value: "mobile1" } },
};

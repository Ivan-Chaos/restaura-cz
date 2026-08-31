import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import type { FormState } from "@/lib/api/form-state";

import { AuthForm } from "./AuthForm";

/** Stand-ins for the Server Action, so the states are reachable in isolation. */
const succeeds = async (): Promise<FormState> => ({ status: "idle" });
const invalidCredentials = async (): Promise<FormState> => ({
  status: "error",
  code: "INVALID_CREDENTIALS",
});
const invalidFields = async (): Promise<FormState> => ({
  status: "error",
  code: "VALIDATION_FAILED",
  fields: { email: "IS_EMAIL" },
});

const meta = {
  title: "Auth/AuthForm",
  component: AuthForm,
  parameters: { layout: "centered" },
  args: { locale: "cs", action: succeeds },
  decorators: [
    (Story) => (
      <div className="w-full max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AuthForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * A wrong password reaches the visitor as one summary message, never pinned to
 * an input: which of the two was wrong is exactly what must not be revealed.
 */
export const WrongCredentials: Story = {
  args: { action: invalidCredentials },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText(/e-?mail/i), "owner@example.com");
    await userEvent.type(canvas.getByLabelText(/heslo|password|passwort/i), "wrong");
    await userEvent.click(canvas.getByRole("button", { name: /přihlásit|sign in|anmelden/i }));

    await expect(await canvas.findByRole("alert")).toBeVisible();
  },
};

export const InvalidEmail: Story = {
  args: { action: invalidFields },
};

/** The return destination rides along as a hidden field, not in the action. */
export const WithReturnDestination: Story = {
  args: { next: "/workspace/settings/profile" },
  play: async ({ canvasElement }) => {
    const hidden = canvasElement.querySelector('input[name="next"]');
    await expect(hidden).toHaveValue("/workspace/settings/profile");
  },
};

export const Narrow: Story = {
  globals: { viewport: { value: "mobile1" } },
};

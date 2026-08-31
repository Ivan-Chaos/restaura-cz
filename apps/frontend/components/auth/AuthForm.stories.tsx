import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { FormState } from "@/lib/api/form-state";

import { AuthForm } from "./AuthForm";

/** Stand-ins for the Server Action, so the states are reachable in isolation. */
const succeeds = async (): Promise<FormState> => ({ status: "idle" });
const emailTaken = async (): Promise<FormState> => ({
  status: "error",
  code: "EMAIL_TAKEN",
});
const invalidFields = async (): Promise<FormState> => ({
  status: "error",
  code: "VALIDATION_FAILED",
  fields: { email: "IS_EMAIL", password: "IS_LENGTH" },
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

export const SignUp: Story = {
  args: { mode: "signUp" },
};

export const SignIn: Story = {
  args: { mode: "signIn" },
};

/**
 * The initial state cannot show an error, so these render the form as it looks
 * before submission; the error branches are covered by the end-to-end tests
 * that actually submit.
 */
export const SignUpWithTakenEmail: Story = {
  args: { mode: "signUp", action: emailTaken },
};

export const SignUpWithInvalidFields: Story = {
  args: { mode: "signUp", action: invalidFields },
};

export const SignInNarrow: Story = {
  globals: { viewport: { value: "mobile1" } },
  args: { mode: "signIn" },
};

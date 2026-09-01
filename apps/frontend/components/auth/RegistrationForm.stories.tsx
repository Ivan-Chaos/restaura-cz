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

const LABELS = {
  email: /^e-?mail$/i,
  password: /^(heslo|password|passwort)$/i,
  confirm: /potvrzení hesla|confirm password|passwort bestätigen/i,
  restaurantName: /název restaurace|restaurant name|name des restaurants/i,
  phone: /telefonní číslo 1|phone number 1|telefonnummer 1/i,
  location: /^(adresa|address|adresse)$/i,
  submit: /vytvořit účet|create account|konto erstellen/i,
};

/** Fills every field with something valid, for stories about what happens next. */
async function fillValid(canvas: ReturnType<typeof within>) {
  await userEvent.type(canvas.getByLabelText(LABELS.email), "owner@example.com");
  await userEvent.type(canvas.getByLabelText(LABELS.password), "correct horse battery");
  await userEvent.type(canvas.getByLabelText(LABELS.confirm), "correct horse battery");
  await userEvent.type(canvas.getByLabelText(LABELS.restaurantName), "U Zlaté Lípy");
  await userEvent.type(canvas.getByLabelText(LABELS.phone), "601234567");
  await userEvent.type(canvas.getByLabelText(LABELS.location), "Praha 2");
}

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
 * The confirmation check is the form's own, so it fires without the action ever
 * running — nothing is sent when the two do not match.
 */
export const PasswordMismatch: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText(LABELS.password), "correct horse");
    await userEvent.type(canvas.getByLabelText(LABELS.confirm), "different horse");
    await userEvent.click(canvas.getByRole("button", { name: LABELS.submit }));

    await expect(canvas.getByLabelText(LABELS.confirm)).toHaveAttribute("aria-invalid", "true");
  },
};

/** A matching pair leaves no error behind. */
export const PasswordsMatch: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await fillValid(canvas);
    await userEvent.click(canvas.getByRole("button", { name: LABELS.submit }));

    await expect(canvas.getByLabelText(LABELS.confirm)).not.toHaveAttribute("aria-invalid");
  },
};

/** Every failing field is marked, all at once, before anything is sent. */
export const CaughtBeforeSending: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText(LABELS.email), "not-an-email");
    await userEvent.click(canvas.getByRole("button", { name: LABELS.submit }));

    await expect(canvas.getByLabelText(LABELS.email)).toHaveAttribute("aria-invalid", "true");
    await expect(canvas.getByLabelText(LABELS.restaurantName)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  },
};

export const WithTakenEmail: Story = {
  args: { action: emailTaken },
};

/**
 * The behaviour this form exists to get right: a rejection from the API marks
 * the email and **keeps everything else the owner typed**. Losing a restaurant
 * name, three phone numbers and an address because an email was already taken
 * is the worst moment in the product to ask someone to start again.
 */
export const KeepsValuesWhenTheServerRejects: Story = {
  args: { action: emailTaken },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await fillValid(canvas);
    await userEvent.click(canvas.getByRole("button", { name: LABELS.submit }));

    await expect(await canvas.findByRole("alert")).toBeVisible();

    await expect(canvas.getByLabelText(LABELS.restaurantName)).toHaveValue("U Zlaté Lípy");
    await expect(canvas.getByLabelText(LABELS.location)).toHaveValue("Praha 2");
    await expect(canvas.getByLabelText(LABELS.phone)).toHaveValue("601 234 567");
    await expect(canvas.getByLabelText(LABELS.email)).toHaveValue("owner@example.com");
  },
};

/** A per-field rejection from the API is marked on the field it names. */
export const WithInvalidFields: Story = {
  args: { action: invalidFields },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await fillValid(canvas);
    await userEvent.click(canvas.getByRole("button", { name: LABELS.submit }));

    await expect(await canvas.findByText(/zadejte platnou e-mailovou adresu/i)).toBeVisible();
    // And the values are still there to correct.
    await expect(canvas.getByLabelText(LABELS.restaurantName)).toHaveValue("U Zlaté Lípy");
  },
};

export const Narrow: Story = {
  globals: { viewport: { value: "mobile1" } },
};

import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor } from "storybook/test";

import { Toaster } from "@/components/ui/sonner";
import { EditDishFormMock } from "./EditDishFormMock";

const meta = {
  title: "Examples/Edit Dish Form",
  component: EditDishFormMock,
  render: (args) => (
    <div className="max-w-lg p-4">
      <EditDishFormMock {...args} />
      {/* Toasts render into a portal on `document.body`, outside this story's
          canvas — mounted here rather than inside the component itself so a
          real page only ever mounts one `Toaster`. */}
      <Toaster />
    </div>
  ),
} satisfies Meta<typeof EditDishFormMock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SimulatesFailure: Story = {
  args: { simulateFailure: true },
};

/**
 * Submitting with an empty name must not proceed: a `FieldError` appears, the
 * input is marked invalid, and focus moves there. Queried by DOM attributes
 * rather than translated text so the assertion holds under every locale the
 * suite runs against.
 */
export const SubmitEmptyShowsError: Story = {
  play: async ({ canvasElement }) => {
    const submit = canvasElement.querySelector<HTMLButtonElement>('button[type="submit"]');
    const nameInput = canvasElement.querySelector<HTMLInputElement>("input[required]");
    if (!submit || !nameInput) throw new Error("form controls not found");

    await userEvent.click(submit);

    await expect(nameInput).toHaveAttribute("aria-invalid", "true");
    await expect(nameInput).toHaveFocus();
    await expect(canvasElement.querySelector('[role="alert"]')).not.toBeNull();
  },
};

/**
 * Filling in the required name and submitting shows the saving state (the
 * submit button disables) and then a success toast once the simulated save
 * resolves. Toast presence is asserted via sonner's own `data-sonner-toast`
 * attribute rather than translated text, again to stay locale-agnostic.
 */
export const FillAndSubmitSucceeds: Story = {
  play: async ({ canvasElement }) => {
    const submit = canvasElement.querySelector<HTMLButtonElement>('button[type="submit"]');
    const nameInput = canvasElement.querySelector<HTMLInputElement>("input[required]");
    if (!submit || !nameInput) throw new Error("form controls not found");

    await userEvent.type(nameInput, "Svíčková na smetaně");
    await userEvent.click(submit);

    await expect(submit).toBeDisabled();

    await waitFor(
      () => {
        if (!document.querySelector('[data-sonner-toast][data-type="success"]')) {
          throw new Error("success toast not yet visible");
        }
      },
      { timeout: 2000 },
    );

    await expect(submit).not.toBeDisabled();
  },
};

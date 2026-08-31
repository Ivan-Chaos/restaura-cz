import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { FieldGroup } from "@/components/ui/field";

import { ProfileFields } from "./ProfileFields";

const meta = {
  title: "Auth/ProfileFields",
  component: ProfileFields,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="w-full max-w-md">
        <FieldGroup>
          <Story />
        </FieldGroup>
      </div>
    ),
  ],
} satisfies Meta<typeof ProfileFields>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Prefilled: Story = {
  args: {
    defaultValues: {
      restaurantName: "U Zlaté Lípy",
      phones: ["+420 601 234 567", "222 333 444"],
      location: "Náměstí Míru 12, 120 00 Praha 2",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByLabelText(/název restaurace|restaurant name|name des restaurants/i),
    ).toHaveValue("U Zlaté Lípy");
    await expect(canvas.getAllByRole("textbox")).toHaveLength(4);
  },
};

/** Each failing field is marked individually — never one message for all three. */
export const WithErrors: Story = {
  args: {
    fields: { restaurantName: "IS_LENGTH", phones: "ARRAY_MIN_SIZE", location: "IS_STRING" },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByLabelText(/název restaurace|restaurant name|name des restaurants/i),
    ).toHaveAttribute("aria-invalid", "true");
    await expect(canvas.getByLabelText(/adresa|address|adresse/i)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  },
};

export const Narrow: Story = {
  globals: { viewport: { value: "mobile1" } },
  args: {
    defaultValues: {
      restaurantName: "Restaurace U Zlaté Lípy a Slavnostních Příležitostí",
      phones: ["+420 601 234 567"],
      location: "Náměstí Míru 12, 120 00 Praha 2, Česká republika",
    },
  },
};

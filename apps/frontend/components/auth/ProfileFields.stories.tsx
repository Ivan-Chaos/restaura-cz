import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { FormHarness } from "@/.storybook/form-harness";
import { FieldGroup } from "@/components/ui/field";
import type { ProfileFormValues } from "@/lib/validation/schemas";

import { ProfileFields } from "./ProfileFields";

const EMPTY: ProfileFormValues = {
  restaurantName: "",
  phones: [{ value: "" }],
  location: "",
};

const FILLED: ProfileFormValues = {
  restaurantName: "U Zlaté Lípy",
  phones: [{ value: "+420 601 234 567" }, { value: "+420 222 333 444" }],
  location: "Náměstí Míru 12, 120 00 Praha 2",
};

/**
 * The component reads values and errors from form context, so each story
 * supplies one rather than passing props.
 */
function harness(values: ProfileFormValues, errors?: Record<string, string>) {
  return function Decorator(Story: () => React.ReactElement) {
    return (
      <div className="w-full max-w-md">
        <FormHarness defaultValues={values} errors={errors as never}>
          <FieldGroup>
            <Story />
          </FieldGroup>
        </FormHarness>
      </div>
    );
  };
}

const meta = {
  title: "Auth/ProfileFields",
  component: ProfileFields,
  parameters: { layout: "padded" },
  decorators: [harness(EMPTY)],
} satisfies Meta<typeof ProfileFields>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Prefilled: Story = {
  decorators: [harness(FILLED)],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByLabelText(/název restaurace|restaurant name|name des restaurants/i),
    ).toHaveValue("U Zlaté Lípy");
    // Name, two phone numbers, address.
    await expect(canvas.getAllByRole("textbox")).toHaveLength(4);
  },
};

/** Each failing field is marked individually — never one message for all three. */
export const WithErrors: Story = {
  decorators: [
    harness(EMPTY, {
      restaurantName: "IS_LENGTH",
      phones: "ARRAY_MIN_SIZE",
      location: "IS_STRING",
    }),
  ],
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
  decorators: [
    harness({
      restaurantName: "Restaurace U Zlaté Lípy a Slavnostních Příležitostí",
      phones: [{ value: "+420 601 234 567" }],
      location: "Náměstí Míru 12, 120 00 Praha 2, Česká republika",
    }),
  ],
};

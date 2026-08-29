import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./select";

/**
 * Select is for choosing one value from a list long enough that showing
 * every option at once (`RadioGroup`) would crowd the page — a language
 * picker, a table-section picker, a delivery time slot. For a short set of
 * two to four options that benefits from being fully visible, prefer
 * `RadioGroup` or `Toggle` buttons instead; they need no extra click to see
 * the choices. Always give the trigger an accessible name, either via
 * `aria-label` or an associated `Label`.
 */
const meta = {
  title: "UI/Select",
  component: Select,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A dropdown for choosing one value from a longer list — a language picker, a delivery time slot, a table section — where showing every option at once would crowd the page. For two to four options, prefer `RadioGroup` or `Toggle` buttons so guests see every choice without an extra click. Always label the trigger.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * `Select` renders the selected item's label in the trigger only once the
 * matching `SelectItem` has mounted in the popup at least once — otherwise it
 * falls back to the raw value. Passing `items` gives it the label mapping
 * upfront, so the trigger shows real text (not "asap") even before the guest
 * has ever opened the popup.
 */
const DELIVERY_TIME_ITEMS = {
  asap: "As soon as possible",
  "18:00": "Today, 18:00",
  "18:30": "Today, 18:30",
  "19:00": "Today, 19:00",
};

const TABLE_SECTION_ITEMS = {
  terrace: "Terrace",
  "main-hall": "Main hall",
  bar: "Bar",
};

const LANGUAGE_ITEMS = {
  cs: "Čeština",
  en: "English",
  de: "Deutsch",
};

const GROUPED_SECTION_ITEMS = {
  "main-hall": "Main hall",
  bar: "Bar",
  terrace: "Terrace",
  garden: "Garden",
};

export const DeliveryTimeSlot: Story = {
  name: "Default",
  render: () => (
    <Select defaultValue="asap" items={DELIVERY_TIME_ITEMS}>
      <SelectTrigger aria-label="Delivery time" className="w-full max-w-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="asap">As soon as possible</SelectItem>
        <SelectItem value="18:00">Today, 18:00</SelectItem>
        <SelectItem value="18:30">Today, 18:30</SelectItem>
        <SelectItem value="19:00">Today, 19:00</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const WithPlaceholder: Story = {
  render: () => (
    <Select items={TABLE_SECTION_ITEMS}>
      <SelectTrigger aria-label="Table section" className="w-full max-w-sm">
        <SelectValue placeholder="Choose a section" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="terrace">Terrace</SelectItem>
        <SelectItem value="main-hall">Main hall</SelectItem>
        <SelectItem value="bar">Bar</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const Small: Story = {
  name: "size=\"sm\"",
  render: () => (
    <Select defaultValue="cs" items={LANGUAGE_ITEMS}>
      <SelectTrigger
        size="sm"
        aria-label="Menu language"
        className="w-full max-w-sm"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="cs">Čeština</SelectItem>
        <SelectItem value="en">English</SelectItem>
        <SelectItem value="de">Deutsch</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Select
      defaultValue="asap"
      disabled
      items={{ asap: "As soon as possible" }}
    >
      <SelectTrigger aria-label="Delivery time" className="w-full max-w-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="asap">As soon as possible</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const GroupedWithSeparator: Story = {
  name: "Groups with label and separator",
  render: () => (
    <Select defaultValue="terrace" items={GROUPED_SECTION_ITEMS}>
      <SelectTrigger aria-label="Table section" className="w-full max-w-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Indoors</SelectLabel>
          <SelectItem value="main-hall">Main hall</SelectItem>
          <SelectItem value="bar">Bar</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Outdoors</SelectLabel>
          <SelectItem value="terrace">Terrace</SelectItem>
          <SelectItem value="garden">Garden</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
};

export const OpensAndChoosesAnOption: Story = {
  render: () => (
    <Select defaultValue="asap" items={DELIVERY_TIME_ITEMS}>
      <SelectTrigger aria-label="Delivery time" className="w-full max-w-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="asap">As soon as possible</SelectItem>
        <SelectItem value="18:00">Today, 18:00</SelectItem>
        <SelectItem value="18:30">Today, 18:30</SelectItem>
      </SelectContent>
    </Select>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    const trigger = canvas.getByRole("combobox", { name: "Delivery time" });
    await expect(trigger).toHaveTextContent("As soon as possible");

    await userEvent.click(trigger);

    const option = await body.findByRole("option", { name: "Today, 18:00" });
    await userEvent.click(option);

    await expect(trigger).toHaveTextContent("Today, 18:00");
  },
};

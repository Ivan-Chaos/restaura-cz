import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { DIETARY_MARKER_IDS } from "@/lib/design-system/dietary";

import { DietaryLegend } from "./DietaryLegend";
import { DietaryMarker } from "./DietaryMarker";
import { DietaryMarkerList } from "./DietaryMarkerList";

/**
 * Two vocabularies a guest reads together: dietary markers (opt-in claims —
 * "vegan", "gluten free") and the 14 EU allergen numbers Czech menus print
 * and expect guests to look up. Neither is ever colour alone — every marker
 * carries an icon and a translated label, every allergen chip an accessible
 * name spelling out the number.
 */
const meta = {
  title: "Menu/Dietary",
  parameters: { layout: "centered" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllMarkers: Story = {
  name: "Every marker",
  render: () => (
    <div className="flex flex-col gap-2">
      {DIETARY_MARKER_IDS.map((id) => (
        <DietaryMarker key={id} id={id} />
      ))}
    </div>
  ),
};

export const IconOnly: Story = {
  name: "Icon only (label still reaches assistive tech)",
  render: () => (
    <div className="flex gap-3">
      {DIETARY_MARKER_IDS.map((id) => (
        <DietaryMarker key={id} id={id} showLabel={false} />
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <DietaryMarker id="vegan" size="sm" />
      <DietaryMarker id="vegan" size="md" />
    </div>
  ),
};

export const MarkerListWithAllergens: Story = {
  name: "Marker list — dietary + allergens",
  render: () => (
    <DietaryMarkerList dietary={["vegetarian", "glutenFree"]} allergens={[1, 7, 9]} />
  ),
};

export const MarkerListAllergensOnly: Story = {
  name: "Marker list — allergens only",
  render: () => <DietaryMarkerList allergens={[1, 7, 9, 12]} />,
};

/** Beyond `max`, the rest collapse into one "+N" chip — its Tooltip spells
 * out what it's hiding rather than making a guest count icons. */
export const MarkerListOverflow: Story = {
  name: "Marker list — overflow collapses into +N",
  render: () => (
    <DietaryMarkerList
      dietary={["vegetarian", "vegan", "glutenFree", "lactoseFree"]}
      allergens={[1, 7, 9]}
      max={3}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const overflowChip = canvas.getByText("+4");

    await expect(overflowChip).toBeVisible();

    await userEvent.hover(overflowChip);

    // The tooltip portals to <body>, outside canvasElement, and translated
    // labels vary by locale — allergen numbers don't, so assert on those.
    const body = within(canvasElement.ownerDocument.body);
    await expect(await body.findByText(/7/, {}, { timeout: 2000 })).toBeVisible();
    await expect(body.getByText(/9/)).toBeVisible();
  },
};

export const Legend: Story = {
  name: "Full legend",
  render: () => <DietaryLegend />,
};

export const LegendCompact: Story = {
  name: "Legend (compact)",
  render: () => <DietaryLegend compact />,
};

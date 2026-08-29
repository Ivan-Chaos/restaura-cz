import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useTranslations } from "next-intl";
import { expect, within } from "storybook/test";

import { ThemeScope } from "@/components/theme/ThemeScope";
import { getSampleMenu } from "@/lib/design-system/fixtures/sample-menu";

import { SampleMenu } from "./SampleMenu";
import { SpecialsStrip } from "./SpecialsStrip";

/**
 * The composed example (spec FR-024).
 *
 * One fixture drives this story, the `/[locale]/sample-menu` route and the
 * end-to-end suite, so what is documented, what is tested and what is measured
 * cannot drift apart. Switch theme, appearance and locale in the toolbar — the
 * page below is the real thing, not a mock-up of it.
 */
function SampleMenuStory({ theme }: { theme?: string }) {
  const t = useTranslations("SampleMenu");
  const menu = getSampleMenu(t);

  const content = <SampleMenu menu={menu} />;

  return (
    <div className="bg-background flex min-h-dvh flex-col">
      {theme ? <ThemeScope theme={theme}>{content}</ThemeScope> : content}
    </div>
  );
}

const meta = {
  title: "Examples/Sample Menu Page",
  component: SampleMenuStory,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "A complete restaurant menu built entirely from this design system — " +
          "no bespoke colour, no hard-coded string. It covers every awkward " +
          "shape real data takes: missing photo, missing description, market " +
          "price, 'from' price, variant prices, sold out, limited availability, " +
          "a 120-character dish name, and all 14 EU allergens.",
      },
    },
  },
} satisfies Meta<typeof SampleMenuStory>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Follows the toolbar: whatever theme, appearance and locale are selected. */
export const Default: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // One h1 — the establishment. Menus with several top-level headings are
    // unnavigable by screen reader.
    await expect(canvas.getAllByRole("heading", { level: 1 })).toHaveLength(1);

    // Every category is a labelled region.
    const sections = canvasElement.querySelectorAll("section[aria-labelledby]");
    await expect(sections.length).toBeGreaterThanOrEqual(4);

    // Menus only: no ordering affordance may render here (spec SC-012).
    await expect(canvasElement.querySelectorAll("[data-ordering]")).toHaveLength(0);
  },
};

/** How a guest actually meets the menu: a phone, at a table. */
export const OnAPhone: Story = {
  args: {},
  globals: { viewport: { value: "mobile1" } },
  play: async () => {
    // Nothing may push the page sideways at the narrowest supported width.
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth + 1,
    );
  },
};

/**
 * The same page, scoped to the alternative theme — the FR-006 claim in one
 * screen. Compare it with `Default`: identical markup, no component changed.
 */
export const ScopedToSlate: Story = {
  args: { theme: "slate" },
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector('[data-theme="slate"]');
    await expect(scope).not.toBeNull();
  },
};

/** An empty specials rail must render nothing rather than an empty heading. */
export const SpecialsStripEmpty: Story = {
  args: {},
  render: () => (
    <div className="bg-background p-4">
      <SpecialsStrip title="Dnešní nabídka" items={[]} />
      <p className="text-muted-foreground text-sm">
        Nothing above this line — the strip renders null when there is nothing to
        show.
      </p>
    </div>
  ),
};

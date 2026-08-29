import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Stack } from "@/components/layout/Stack";
import { THEMES } from "@/lib/design-system/themes";

import { ThemeScope } from "./ThemeScope";

/**
 * `ThemeScope` is the whole multi-theme story in one component: it sets a
 * `data-theme` attribute and nothing else. No context, no JavaScript, no
 * hydration flash — the CSS cascade does the rest.
 */
const meta = {
  title: "Theme/ThemeScope",
  component: ThemeScope,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Applies a menu theme to a subtree. Renders `display: contents` by " +
          "default, so it adds a DOM node but no box and cannot disturb the " +
          "layout it wraps. Use it to render a restaurant's menu in that " +
          "restaurant's theme while the surrounding page stays on the default.",
      },
    },
  },
} satisfies Meta<typeof ThemeScope>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A stand-in for real menu content, built only from primitives. */
function Sample({ label }: { label: string }) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="font-display">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <Stack gap={3}>
          <p className="text-muted-foreground text-sm">
            Krémová omáčka z kořenové zeleniny, houskové knedlíky, brusinky.
          </p>
          <Stack direction="row" gap={2} align="center" wrap>
            <span className="text-price font-body text-lg tabular-nums">285 Kč</span>
            <Badge>Tip šéfkuchaře</Badge>
            <Badge variant="secondary">Vegetariánské</Badge>
          </Stack>
          <div>
            <Button>Zobrazit lístek</Button>
          </div>
        </Stack>
      </CardContent>
    </Card>
  );
}

/**
 * The point of the whole architecture: identical markup, two themes, zero
 * component changes. Colours, radii, shadows, spacing rhythm and type all move.
 */
export const SideBySide: Story = {
  args: { theme: "warm" },
  render: () => (
    <div className="bg-background grid gap-6 p-6 md:grid-cols-2">
      {THEMES.map((theme) => (
        <ThemeScope key={theme.id} theme={theme.id} as="div" className="block">
          <div className="bg-background flex flex-col gap-3 rounded-lg p-4">
            <h3 className="font-display text-lg">
              {theme.id}
              {theme.isDefault ? " (default)" : ""}
            </h3>
            <Sample label="Svíčková na smetaně" />
          </div>
        </ThemeScope>
      ))}
    </div>
  ),
};

/**
 * Themes nest. A slate menu can sit inside a warm page — which is what makes
 * per-restaurant theming possible without theming the whole application
 * (spec FR-008).
 */
export const Nested: Story = {
  args: { theme: "warm" },
  render: () => (
    <ThemeScope theme="warm" as="div" className="block">
      <div className="bg-background flex flex-col gap-4 p-6">
        <h3 className="font-display text-lg">Warm page</h3>
        <Sample label="Warm scope" />

        <ThemeScope theme="slate" as="div" className="block">
          <div className="bg-background flex flex-col gap-3 rounded-lg p-4">
            <h3 className="font-display text-lg">Slate menu nested inside</h3>
            <Sample label="Slate scope" />
          </div>
        </ThemeScope>
      </div>
    </ThemeScope>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The inner scope must actually win for its subtree.
    const scopes = canvasElement.querySelectorAll("[data-theme]");
    await expect(scopes.length).toBeGreaterThanOrEqual(2);
    await expect(canvas.getByText("Slate scope")).toBeVisible();

    const outer = canvasElement.querySelector('[data-theme="warm"]');
    const inner = canvasElement.querySelector('[data-theme="slate"]');
    await expect(outer).not.toBeNull();
    await expect(inner).not.toBeNull();

    // Compare the two scopes against each other, not against the document root:
    // the harness runs this story with the root itself set to slate on one pass,
    // so a root comparison would be vacuously true exactly when nesting matters
    // most.
    const read = (el: Element) =>
      getComputedStyle(el).getPropertyValue("--primary").trim();

    await expect(read(inner as Element)).not.toBe("");
    await expect(read(inner as Element)).not.toBe(read(outer as Element));
  },
};

/** An unknown theme falls back to the default rather than rendering unstyled. */
export const UnknownThemeFallsBack: Story = {
  args: { theme: "does-not-exist" },
  render: (args) => (
    <ThemeScope {...args} as="div" className="block">
      <div className="bg-background p-6">
        <Sample label="Falls back to the default theme" />
      </div>
    </ThemeScope>
  ),
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector("[data-theme]");
    await expect(scope?.getAttribute("data-theme")).toBe("warm");
  },
};

/**
 * Guards the test harness itself.
 *
 * The suite runs twice under different globals (`warm/light/cs` and
 * `slate/dark/de`); the second pass is what catches hard-coded colours. If the
 * variant wiring in `.storybook/vitest.setup.ts` ever silently stopped applying,
 * every story would keep passing while only ever being checked in one
 * combination. This story fails loudly instead.
 */
export const AppliedGlobalsAreCoherent: Story = {
  args: { theme: "warm" },
  render: () => (
    <div className="bg-background text-foreground p-6">
      <p className="font-body">Harness self-check.</p>
    </div>
  ),
  play: async ({ globals }) => {
    const root = document.documentElement;

    // Whatever theme the harness selected must be the one in the DOM…
    await expect(root.getAttribute("data-theme")).toBe(globals.theme ?? "warm");

    // …and the appearance global must agree with the class that drives the CSS.
    const expectDark = (globals.appearance ?? "light") === "dark";
    await expect(root.classList.contains("dark")).toBe(expectDark);

    // …and the tokens must actually resolve, not fall through to nothing.
    const styles = getComputedStyle(root);
    for (const token of ["--background", "--foreground", "--primary", "--price"]) {
      await expect(styles.getPropertyValue(token).trim()).not.toBe("");
    }
  },
};

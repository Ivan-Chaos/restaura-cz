import { expect, test } from "@playwright/test";

/**
 * The published documentation must work, not just build.
 *
 * Vitest proves each story renders; this proves the *site* a developer actually
 * opens does — that the docs pages exist, and that the theme and appearance
 * toolbars really re-render the preview. Those toolbars are how FR-022 is
 * satisfied, so an accidentally broken decorator would silently gut the claim.
 */

/** Storybook renders each story in an iframe; that is where the DOM lives. */
const previewUrl = (storyId: string, globals = "") =>
  `/iframe.html?id=${storyId}&viewMode=story${globals ? `&globals=${globals}` : ""}`;

const STORY = "layout-primitives--containers";

test("the docs site builds and lists the documentation sections", async ({ page }) => {
  await page.goto("/index.html");

  await expect(page.locator("#storybook-explorer-tree")).toBeVisible({
    timeout: 60_000,
  });

  for (const section of ["Documentation", "Layout"]) {
    await expect(page.getByText(section, { exact: false }).first()).toBeVisible();
  }
});

test("the appearance toolbar changes the rendered appearance", async ({ page }) => {
  await page.goto(previewUrl(STORY, "appearance:light"));
  await expect(page.locator("#storybook-root")).toBeVisible();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  const light = await page.evaluate(
    () => getComputedStyle(document.body).backgroundColor,
  );

  await page.goto(previewUrl(STORY, "appearance:dark"));
  await expect(page.locator("html")).toHaveClass(/dark/);
  const dark = await page.evaluate(
    () => getComputedStyle(document.body).backgroundColor,
  );

  // The class is the mechanism; a different painted colour is the outcome that
  // actually matters to a reader.
  expect(dark).not.toBe(light);
});

test("the theme toolbar changes the rendered theme", async ({ page }) => {
  await page.goto(previewUrl(STORY, "theme:warm"));
  await expect(page.locator("html")).toHaveAttribute("data-theme", "warm");
  const warm = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--primary"),
  );

  await page.goto(previewUrl(STORY, "theme:slate"));
  await expect(page.locator("html")).toHaveAttribute("data-theme", "slate");
  const slate = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--primary"),
  );

  expect(warm.trim()).not.toBe("");
  expect(slate.trim()).not.toBe(warm.trim());
});

test("the toolbar offers the owner-selectable styles too", async ({ page }) => {
  // Feature 005: the toolbar is derived from the registry, so a new theme has
  // to appear there with no Storybook change — and Liquid Glass is the one
  // theme whose panel is translucent, which is what makes it worth checking.
  await page.goto(previewUrl(STORY, "theme:liquid-glass"));
  await expect(page.locator("html")).toHaveAttribute("data-theme", "liquid-glass");

  const panel = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--panel").trim(),
  );
  expect(panel).not.toBe("");
  expect(panel).not.toBe("transparent");
});

test("theme and appearance are independent axes", async ({ page }) => {
  // Any theme × any appearance must be valid (spec FR-009). The failure this
  // guards against is one decorator resetting the other's global.
  await page.goto(previewUrl(STORY, "theme:slate;appearance:dark"));

  await expect(page.locator("html")).toHaveAttribute("data-theme", "slate");
  await expect(page.locator("html")).toHaveClass(/dark/);
});

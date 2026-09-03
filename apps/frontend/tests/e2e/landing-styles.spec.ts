import { expect, test } from "@playwright/test";

/**
 * Spec 005 User Story 4: a prospective customer can open the sample menu in
 * each owner-selectable style straight from the landing page.
 */
test.describe("landing style gallery", () => {
  test("links to the sample menu in every style, and to nothing else", async ({ page }) => {
    await page.goto("/cs");

    const gallery = page.getByRole("navigation", { name: "Prohlédnout styly" });
    await gallery.scrollIntoViewIfNeeded();
    const links = gallery.getByRole("link");
    await expect(links).toHaveCount(6);

    for (const href of await links.evaluateAll((els) =>
      els.map((el) => el.getAttribute("href") ?? ""),
    )) {
      expect(href, "every link is a sample-menu path").toMatch(/\/cs\/sample-menu(\/[a-z-]+)?$/);
      expect(href).not.toContain("slate");
    }
  });

  test("opens the chosen style", async ({ page }) => {
    await page.goto("/cs");

    const gallery = page.getByRole("navigation", { name: "Prohlédnout styly" });
    await gallery.scrollIntoViewIfNeeded();
    await gallery.getByRole("link", { name: "Zelený bar" }).click();

    await expect(page).toHaveURL(/\/cs\/sample-menu\/green-bar$/);
    await expect(page.locator('[data-theme="green-bar"]')).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});

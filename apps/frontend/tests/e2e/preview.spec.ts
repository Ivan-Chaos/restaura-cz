import { expect, test } from "@playwright/test";

import { addItem, addSection, createMenu, signUp } from "./helpers/owner";

/**
 * Spec 005 User Story 3: an owner previews their own menu in a style before
 * committing to it. Drafts included — the public address does not exist yet,
 * and the preview must not need it.
 */

function menuIdFrom(editorUrl: string): string {
  const match = editorUrl.match(/\/menus\/([0-9a-f-]{36})$/);
  if (!match) throw new Error(`Not an editor URL: ${editorUrl}`);
  return match[1];
}

test.describe("style preview", () => {
  test("shows a draft in the chosen style, then applies it on request", async ({ page }) => {
    await signUp(page);
    const editorUrl = await createMenu(page, "Degustační menu");
    const menuId = menuIdFrom(editorUrl);

    await addSection(page, "Předkrmy");
    await addItem(page, "Předkrmy", { name: "Tatarák z jelena", price: "189" });

    // Preview a style that is not the saved one.
    await page.goto(`/cs/preview/${menuId}/refined`);
    await expect(page.locator('[data-theme="refined"]')).toHaveCount(1);
    await expect(page.getByRole("region", { name: "Náhled stylu" })).toBeVisible();
    await expect(page.getByText("Náhled: Vytříbený")).toBeVisible();
    await expect(page.getByText("Tatarák z jelena")).toBeVisible();
    await expect(page.getByText("189 Kč").first()).toBeVisible();

    // Looking is not choosing: the editor still says Classic.
    await page.goto(editorUrl);
    await expect(page.getByRole("radio", { name: /Klasický/ })).toBeChecked();

    // Choosing from the preview saves it.
    await page.goto(`/cs/preview/${menuId}/refined`);
    await page.getByRole("button", { name: "Použít tento styl" }).click();
    await expect(page.getByText("Styl použit.")).toBeVisible();

    await page.goto(editorUrl);
    await expect(page.getByRole("radio", { name: /Vytříbený/ })).toBeChecked();
  });

  test("links from each style card to its preview", async ({ page }) => {
    await signUp(page);
    const editorUrl = await createMenu(page, "Polední menu");
    const menuId = menuIdFrom(editorUrl);

    const link = page.getByRole("link", { name: /Náhled: Zelený bar/ });
    await expect(link).toHaveAttribute("href", new RegExp(`/cs/preview/${menuId}/green-bar$`));
  });

  test("treats an unknown style as an address that does not exist", async ({ page }) => {
    await signUp(page);
    const menuId = menuIdFrom(await createMenu(page, "Polední menu"));

    const response = await page.goto(`/cs/preview/${menuId}/elegant`);
    expect(response?.status()).toBe(404);
  });

  test("is not for guests", async ({ page, browser }) => {
    await signUp(page);
    const menuId = menuIdFrom(await createMenu(page, "Polední menu"));

    const visitor = await browser.newContext();
    const visitorPage = await visitor.newPage();
    await visitorPage.goto(`/cs/preview/${menuId}/modern`);
    await expect(visitorPage).toHaveURL(/\/cs\/sign-in\?next=/);
    await visitor.close();
  });
});

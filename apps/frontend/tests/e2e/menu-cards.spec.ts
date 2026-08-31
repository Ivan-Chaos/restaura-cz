import { expect, test } from "@playwright/test";

import { createMenu, publish, signUp } from "./helpers/owner";

/**
 * User Story 3: the menus section reads like a set of menus, and a card is the
 * way into the one it names.
 */
test.describe("the menus section", () => {
  test("invites a first menu when there are none (AS3)", async ({ page }) => {
    await signUp(page);

    await expect(page.getByText("Zatím žádná menu")).toBeVisible();
    // The way out of the empty state is in the empty state.
    await expect(page.getByRole("button", { name: "Vytvořit menu" })).toBeVisible();
  });

  test("shows each menu as a card naming it, and opens it when clicked", async ({ page }) => {
    await signUp(page);
    await createMenu(page, "Polední menu");

    await page.goto("/cs/workspace/menus");

    const card = page.getByRole("link", { name: "Polední menu" });
    await expect(card).toBeVisible();
    await expect(page.getByText("Koncept")).toBeVisible();
    await expect(page.getByText("Zatím nezveřejněno")).toBeVisible();

    await card.click();
    await expect(page).toHaveURL(/\/workspace\/menus\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { name: "Polední menu" })).toBeVisible();
  });

  test("shows a published menu's public address on its card (AS1)", async ({ page }) => {
    await signUp(page);
    await createMenu(page, "Stálá nabídka");
    const publicPath = await publish(page);

    await page.goto("/cs/workspace/menus");

    await expect(page.getByText("Zveřejněno")).toBeVisible();
    await expect(page.getByText(publicPath.replace(/^.*(\/m\/)/, "/m/"))).toBeVisible();
  });

  test("lists every menu, and adds a new one to the list (AS4)", async ({ page }) => {
    await signUp(page);
    await createMenu(page, "Polední menu");
    await createMenu(page, "Nápojový lístek");

    await page.goto("/cs/workspace/menus");

    await expect(page.getByRole("link", { name: "Polední menu" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Nápojový lístek" })).toBeVisible();
  });

  /**
   * The delete control sits on the card that is itself a link, so it has to
   * stay independently clickable — the failure mode is opening the editor
   * instead of asking.
   */
  test("still asks before deleting, from the card", async ({ page }) => {
    await signUp(page);
    await createMenu(page, "Polední menu");
    await page.goto("/cs/workspace/menus");

    await page.getByRole("button", { name: "Smazat" }).click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page).toHaveURL(/\/cs\/workspace\/menus$/);

    await page.getByRole("button", { name: "Smazat menu" }).click();

    await expect(page.getByRole("link", { name: "Polední menu" })).toHaveCount(0);
    await expect(page.getByText("Zatím žádná menu")).toBeVisible();
  });

  test("works in English as well as Czech", async ({ page }) => {
    await signUp(page, "en");
    await createMenu(page, "Lunch menu", "en");

    await page.goto("/en/workspace/menus");
    await expect(page.getByRole("link", { name: "Lunch menu" })).toBeVisible();
    await expect(page.getByText("Draft")).toBeVisible();
  });
});

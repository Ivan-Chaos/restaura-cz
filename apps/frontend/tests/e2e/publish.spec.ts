import { expect, test } from "@playwright/test";

import { addItem, addSection, createMenu, publish, signUp } from "./helpers/owner";

/**
 * User Story 3: publishing is the gate. Before it, a menu belongs to its owner
 * alone; after it, anyone with the link can read it — and unpublishing takes it
 * back.
 */

test.describe("publishing", () => {
  test("a draft menu has no public address", async ({ page }) => {
    await signUp(page);
    await createMenu(page, "Polední menu");

    await expect(page.getByText("Zatím nezveřejněno")).toBeVisible();
    await expect(page.locator("code")).toHaveCount(0);
  });

  test("publishing reveals a shareable address", async ({ page }) => {
    await signUp(page);
    await createMenu(page, "Polední menu");

    const url = await publish(page);

    expect(url).toMatch(/\/cs\/m\/poledni-menu-[a-z0-9]{6}$/);
    await expect(page.getByText("Živě")).toBeVisible();
  });

  test("the published menu is readable by a signed-out guest", async ({ page, browser }) => {
    await signUp(page);
    await createMenu(page, "Polední menu");
    await addSection(page, "Polévky");
    await addItem(page, "Polévky", { name: "Kulajda", price: "89" });
    const url = await publish(page);

    // A brand-new context: no session cookie, exactly like a guest.
    const guest = await browser.newContext();
    const guestPage = await guest.newPage();
    await guestPage.goto(url);

    await expect(guestPage.getByText("Polední menu")).toBeVisible();
    await expect(guestPage.getByText("Kulajda")).toBeVisible();
    await guest.close();
  });

  test("unpublishing takes the menu offline on the next request", async ({ page, browser }) => {
    await signUp(page);
    await createMenu(page, "Polední menu");
    const url = await publish(page);

    const guest = await browser.newContext();
    const guestPage = await guest.newPage();
    await expect((await guestPage.goto(url))?.status()).toBe(200);

    await page.getByRole("button", { name: "Zrušit zveřejnění" }).click();
    await expect(page.getByText("Zatím nezveřejněno")).toBeVisible();

    const afterUnpublish = await guestPage.goto(url);
    expect(afterUnpublish?.status()).toBe(404);
    await expect(guestPage.getByText("Toto menu není dostupné")).toBeVisible();

    await guest.close();
  });

  test("republishing reuses the same address, so a printed code keeps working", async ({
    page,
  }) => {
    await signUp(page);
    await createMenu(page, "Polední menu");
    const first = await publish(page);

    await page.getByRole("button", { name: "Zrušit zveřejnění" }).click();
    await expect(page.getByText("Zatím nezveřejněno")).toBeVisible();

    const second = await publish(page);
    expect(second).toBe(first);
  });

  test("a saved edit shows on the public page straight away", async ({ page, browser }) => {
    await signUp(page);
    await createMenu(page, "Polední menu");
    await addSection(page, "Polévky");
    await addItem(page, "Polévky", { name: "Kulajda", price: "89" });
    const url = await publish(page);

    const guest = await browser.newContext();
    const guestPage = await guest.newPage();
    await guestPage.goto(url);
    // Price renders an accessible label plus an aria-hidden visual copy, so the
    // text appears twice by design.
    await expect(guestPage.getByText("89 Kč").first()).toBeVisible();

    // Edit the price as the owner. Scoped to the dish's row: the section also
    // has an always-present "add a dish" form with the same fields.
    await page.getByRole("button", { name: "Upravit" }).click();
    const row = page.getByRole("listitem").filter({ has: page.locator('input[name="priceCzk"]') });
    await row.getByRole("textbox", { name: "Cena" }).fill("95");
    await row.getByRole("button", { name: "Uložit", exact: true }).click();
    await expect(page.getByText("95 Kč")).toBeVisible();

    await guestPage.reload();
    await expect(guestPage.getByText("95 Kč").first()).toBeVisible();

    await guest.close();
  });

  test("publishing an empty menu is allowed", async ({ page, browser }) => {
    await signUp(page);
    await createMenu(page, "Prázdné menu");
    const url = await publish(page);

    const guest = await browser.newContext();
    const guestPage = await guest.newPage();
    const response = await guestPage.goto(url);

    expect(response?.status()).toBe(200);
    await expect(guestPage.getByText("Prázdné menu")).toBeVisible();
    await guest.close();
  });

  test("deleting a published menu retires its address", async ({ page, browser }) => {
    await signUp(page);
    await createMenu(page, "Polední menu");
    const url = await publish(page);

    await page.goto("/cs/workspace/menus");
    await page.getByRole("button", { name: "Smazat", exact: true }).click();
    await page.getByRole("button", { name: "Smazat menu" }).click();
    await expect(page.getByText("Zatím žádná menu")).toBeVisible();

    const guest = await browser.newContext();
    const guestPage = await guest.newPage();
    expect((await guestPage.goto(url))?.status()).toBe(404);
    await guest.close();
  });
});

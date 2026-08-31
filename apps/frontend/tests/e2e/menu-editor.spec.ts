import { expect, test } from "@playwright/test";

import { addItem, addSection, createMenu, PASSWORD, sectionCard, signUp } from "./helpers/owner";

/**
 * User Story 2: an owner builds a menu out of sections and dishes, and nothing
 * they typed is lost between visits.
 */

test.describe("menu creation and filling", () => {
  test("creates a menu in the draft state", async ({ page }) => {
    await signUp(page);
    await createMenu(page, "Polední menu");

    await expect(page.getByRole("heading", { name: "Polední menu", level: 1 })).toBeVisible();
    await expect(page.getByText("Koncept")).toBeVisible();
  });

  test("fills a menu with sections and dishes", async ({ page }) => {
    await signUp(page);
    await createMenu(page, "Polední menu");

    await addSection(page, "Polévky");
    await addSection(page, "Hlavní jídla");

    await addItem(page, "Polévky", {
      name: "Kulajda",
      description: "Se zastřeným vejcem",
      price: "89",
    });
    await addItem(page, "Hlavní jídla", { name: "Svíčková", price: "245" });

    await expect(page.getByText("Kulajda", { exact: true })).toBeVisible();
    await expect(page.getByText("Se zastřeným vejcem")).toBeVisible();
    await expect(page.getByText("Svíčková", { exact: true })).toBeVisible();
  });

  test("keeps everything after signing out and back in", async ({ page }) => {
    const { email } = await signUp(page);
    const editorUrl = await createMenu(page, "Polední menu");
    await addSection(page, "Polévky");
    await addItem(page, "Polévky", { name: "Kulajda", price: "89" });

    await page.goto("/cs/workspace/menus");
    await page.getByRole("button", { name: "Odhlásit se" }).click();
    await page.waitForURL("**/cs/sign-in");

    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Heslo").fill(PASSWORD);
    await page.getByRole("button", { name: "Přihlásit se" }).click();
    await page.waitForURL("**/cs/workspace/menus");

    await page.goto(editorUrl);
    await expect(page.locator('input[value="Polévky"]')).toBeVisible();
    await expect(page.getByText("Kulajda", { exact: true })).toBeVisible();
    await expect(page.getByText("89")).toBeVisible();
  });

  test("rejects a dish with no name", async ({ page }) => {
    await signUp(page);
    await createMenu(page, "Polední menu");
    await addSection(page, "Polévky");

    const card = sectionCard(page, "Polévky");
    await card.getByRole("textbox", { name: "Cena" }).fill("89");
    await card.getByRole("button", { name: "Přidat jídlo" }).click();

    await expect(card.getByText("Toto pole je povinné.")).toBeVisible();
  });

  test("rejects a negative price and keeps what was typed", async ({ page }) => {
    await signUp(page);
    await createMenu(page, "Polední menu");
    await addSection(page, "Polévky");

    const card = sectionCard(page, "Polévky");
    await card.getByRole("textbox", { name: "Název jídla" }).fill("Kulajda");
    await card.getByRole("textbox", { name: "Cena" }).fill("-5");
    await card.getByRole("button", { name: "Přidat jídlo" }).click();

    await expect(card.getByText("Cena nesmí být záporná.")).toBeVisible();
    // The dish was not created.
    await expect(page.getByText("V této sekci zatím nejsou žádná jídla")).toBeVisible();
  });

  test("rejects a price that is not a number", async ({ page }) => {
    await signUp(page);
    await createMenu(page, "Polední menu");
    await addSection(page, "Polévky");

    const card = sectionCard(page, "Polévky");
    await card.getByRole("textbox", { name: "Název jídla" }).fill("Kulajda");
    await card.getByRole("textbox", { name: "Cena" }).fill("zdarma");
    await card.getByRole("button", { name: "Přidat jídlo" }).click();

    await expect(card.getByText("Zadejte celé číslo korun.")).toBeVisible();
  });

  test("renames a section", async ({ page }) => {
    await signUp(page);
    await createMenu(page, "Polední menu");
    await addSection(page, "Polévky");

    const card = sectionCard(page, "Polévky");
    await card.getByRole("textbox", { name: "Název sekce" }).fill("Polévky a předkrmy");
    await card.getByRole("button", { name: "Uložit" }).click();

    await expect(page.locator('input[value="Polévky a předkrmy"]')).toBeVisible();
  });

  test("deletes a dish after confirming", async ({ page }) => {
    await signUp(page);
    await createMenu(page, "Polední menu");
    await addSection(page, "Polévky");
    await addItem(page, "Polévky", { name: "Kulajda", price: "89" });

    await page.getByRole("button", { name: "Smazat jídlo" }).click();
    await expect(page.getByRole("dialog")).toContainText("Smazat toto jídlo?");
    await page.getByRole("button", { name: "Smazat", exact: true }).click();

    await expect(page.getByText("V této sekci zatím nejsou žádná jídla")).toBeVisible();
  });

  test("shows the variant switcher locked to the one available style", async ({ page }) => {
    await signUp(page);
    await createMenu(page, "Polední menu");

    await expect(page.getByText("Vizuální styl")).toBeVisible();
    await expect(page.getByRole("radio", { checked: true })).toBeVisible();

    // The other styles are visible but cannot be chosen yet.
    const comingSoon = page.getByText("Připravujeme");
    await expect(comingSoon.first()).toBeVisible();
    for (const radio of await page.getByRole("radio").all()) {
      const checked = await radio.isChecked();
      if (!checked) await expect(radio).toBeDisabled();
    }
  });

  test("hides another owner's menu", async ({ page }) => {
    await signUp(page);
    const editorUrl = await createMenu(page, "Polední menu");

    await page.goto("/cs/workspace/menus");
    await page.getByRole("button", { name: "Odhlásit se" }).click();
    await page.waitForURL("**/cs/sign-in");

    await signUp(page);
    const response = await page.goto(editorUrl);

    expect(response?.status()).toBe(404);
  });

  test("works in English", async ({ page }) => {
    await signUp(page, "en");
    await createMenu(page, "Lunch menu", "en");

    await expect(page.getByRole("heading", { name: "Lunch menu", level: 1 })).toBeVisible();
    await expect(page.getByText("Draft")).toBeVisible();
    await expect(page.getByText("No sections yet")).toBeVisible();
  });
});

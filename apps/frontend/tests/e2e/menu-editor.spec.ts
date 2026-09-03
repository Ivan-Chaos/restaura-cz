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
    await expect(page.getByRole("heading", { name: "Polévky", exact: true })).toBeVisible();
    await expect(page.getByText("Kulajda", { exact: true })).toBeVisible();
    // The formatted price, not the bare digits: the hint under the price field
    // names an example price too.
    await expect(page.getByText("89 Kč")).toBeVisible();
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
    await card.getByRole("textbox", { name: "Popis" }).fill("Se zastřeným vejcem");
    await card.getByRole("textbox", { name: "Cena" }).fill("-5");
    await card.getByRole("button", { name: "Přidat jídlo" }).click();

    await expect(card.getByText("Cena nesmí být záporná.")).toBeVisible();

    // The half this test is named after, and used not to check: everything
    // typed is still on screen, so the owner corrects the price instead of
    // entering the dish again. React empties an uncontrolled form once its
    // action completes, which is why this form is not one.
    await expect(card.getByRole("textbox", { name: "Název jídla" })).toHaveValue("Kulajda");
    await expect(card.getByRole("textbox", { name: "Popis" })).toHaveValue(
      "Se zastřeným vejcem",
    );
    await expect(card.getByRole("textbox", { name: "Cena" })).toHaveValue("-5");

    // And the dish was not created.
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

    await expect(card.getByText("Zadejte cenu, například 89 nebo 56,50.")).toBeVisible();
  });

  test("says what was saved, since each save is its own request", async ({ page }) => {
    await signUp(page);
    await createMenu(page, "Polední menu");
    await addSection(page, "Polévky");

    // The section was added through the helper, which waits for the heading —
    // its toast confirms the write landed rather than merely re-rendering.
    await expect(page.getByText("Sekce přidána.")).toBeVisible();

    const card = sectionCard(page, "Polévky");
    await card.getByRole("textbox", { name: "Název jídla" }).fill("Kulajda");
    await card.getByRole("textbox", { name: "Cena" }).fill("89");
    await card.getByRole("button", { name: "Přidat jídlo" }).click();

    await expect(page.getByText("Jídlo přidáno.")).toBeVisible();
  });

  test("accepts a price with hellers and prints it as a guest reads it", async ({ page }) => {
    await signUp(page);
    await createMenu(page, "Polední menu");
    await addSection(page, "Polévky");

    const card = sectionCard(page, "Polévky");
    await card.getByRole("textbox", { name: "Název jídla" }).fill("Kulajda");
    // A comma, because that is what a Czech keyboard and a Czech reader use.
    await card.getByRole("textbox", { name: "Cena" }).fill("56,50");
    await card.getByRole("button", { name: "Přidat jídlo" }).click();

    await expect(page.getByText("Kulajda", { exact: true })).toBeVisible();
    await expect(card.getByText("56,50 Kč")).toBeVisible();
  });

  test("rejects a price with more precision than money has", async ({ page }) => {
    await signUp(page);
    await createMenu(page, "Polední menu");
    await addSection(page, "Polévky");

    const card = sectionCard(page, "Polévky");
    await card.getByRole("textbox", { name: "Název jídla" }).fill("Kulajda");
    await card.getByRole("textbox", { name: "Cena" }).fill("56,555");
    await card.getByRole("button", { name: "Přidat jídlo" }).click();

    await expect(card.getByText("Zadejte cenu, například 89 nebo 56,50.")).toBeVisible();
  });

  test("renames a section", async ({ page }) => {
    await signUp(page);
    await createMenu(page, "Polední menu");
    await addSection(page, "Polévky");

    const card = sectionCard(page, "Polévky");
    await card.getByRole("button", { name: "Přejmenovat" }).click();
    await card.getByRole("textbox", { name: "Název sekce" }).fill("Polévky a předkrmy");
    await card.getByRole("button", { name: "Uložit" }).click();

    await expect(
      page.getByRole("heading", { name: "Polévky a předkrmy", exact: true }),
    ).toBeVisible();
  });

  test("leaves a section alone when a rename is cancelled", async ({ page }) => {
    await signUp(page);
    await createMenu(page, "Polední menu");
    await addSection(page, "Polévky");

    const card = sectionCard(page, "Polévky");
    await card.getByRole("button", { name: "Přejmenovat" }).click();
    await card.getByRole("textbox", { name: "Název sekce" }).fill("Něco jiného");
    await card.getByRole("button", { name: "Zrušit" }).click();

    await expect(page.getByRole("heading", { name: "Polévky", exact: true })).toBeVisible();
  });

  test("renames the menu from its own heading", async ({ page }) => {
    await signUp(page);
    await createMenu(page, "Polední menu");

    await page.getByRole("button", { name: "Přejmenovat menu" }).click();
    await page.getByRole("textbox", { name: "Název menu" }).fill("Večerní menu");
    await page.getByRole("button", { name: "Uložit název" }).click();

    await expect(page.getByRole("heading", { name: "Večerní menu", level: 1 })).toBeVisible();
  });

  test("edits a dish in place", async ({ page }) => {
    await signUp(page);
    await createMenu(page, "Polední menu");
    await addSection(page, "Polévky");
    await addItem(page, "Polévky", { name: "Kulajda", price: "89" });

    await page.getByRole("button", { name: "Upravit" }).click();

    // Scoped to the dish's own row: the section also has an always-present
    // form for adding a dish, with the same field names.
    const row = page
      .getByRole("listitem")
      .filter({ has: page.locator('input[name="priceCzk"]') });
    await expect(row.getByRole("textbox", { name: "Název jídla" })).toHaveValue("Kulajda");

    await row.getByRole("textbox", { name: "Název jídla" }).fill("Kulajda s koprem");
    await row.getByRole("textbox", { name: "Cena" }).fill("95");
    await row.getByRole("button", { name: "Uložit", exact: true }).click();

    await expect(page.getByText("Kulajda s koprem", { exact: true })).toBeVisible();
    await expect(page.getByText("95 Kč")).toBeVisible();
    // The row closed again, so the owner is looking at what was stored rather
    // than at the form that stored it. Only the add-dish form is left.
    await expect(page.locator('input[name="priceCzk"]')).toHaveCount(1);
  });

  test("keeps an edit on screen when the save is rejected", async ({ page }) => {
    await signUp(page);
    await createMenu(page, "Polední menu");
    await addSection(page, "Polévky");
    await addItem(page, "Polévky", { name: "Kulajda", price: "89" });

    await page.getByRole("button", { name: "Upravit" }).click();
    const row = page
      .getByRole("listitem")
      .filter({ has: page.locator('input[name="priceCzk"]') });
    await row.getByRole("textbox", { name: "Název jídla" }).fill("Kulajda s koprem");
    await row.getByRole("textbox", { name: "Cena" }).fill("zdarma");
    await row.getByRole("button", { name: "Uložit", exact: true }).click();

    await expect(row.getByText("Zadejte cenu, například 89 nebo 56,50.")).toBeVisible();
    await expect(row.getByRole("textbox", { name: "Název jídla" })).toHaveValue(
      "Kulajda s koprem",
    );
  });

  test("duplicates a dish directly below the original", async ({ page }) => {
    await signUp(page);
    await createMenu(page, "Polední menu");
    await addSection(page, "Polévky");
    await addItem(page, "Polévky", { name: "Kulajda", price: "89" });
    await addItem(page, "Polévky", { name: "Česnečka", price: "79" });

    const card = sectionCard(page, "Polévky");
    await card
      .getByRole("listitem")
      .filter({ hasText: "Kulajda" })
      .getByRole("button", { name: "Duplikovat jídlo" })
      .click();

    await expect(card.getByText("Kulajda", { exact: true })).toHaveCount(2);

    // The copy sits between the original and the dish that followed it, which
    // is the whole point of duplicating rather than adding.
    await expect(card.getByRole("listitem").nth(0)).toContainText("Kulajda");
    await expect(card.getByRole("listitem").nth(1)).toContainText("Kulajda");
    await expect(card.getByRole("listitem").nth(2)).toContainText("Česnečka");
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

  test("picks and keeps a visual style", async ({ page }) => {
    await signUp(page);
    await createMenu(page, "Polední menu");

    await expect(page.getByText("Vizuální styl")).toBeVisible();

    // Six styles, all selectable, none "coming soon"; Classic is the default.
    const radios = page.getByRole("radio");
    await expect(radios).toHaveCount(6);
    await expect(page.getByText("Připravujeme")).toHaveCount(0);
    for (const radio of await radios.all()) await expect(radio).toBeEnabled();
    await expect(page.getByRole("radio", { name: /Klasický/ })).toBeChecked();

    // Choosing a card saves it.
    await page.getByRole("radio", { name: /Zelený bar/ }).check();
    await expect(page.getByText("Vizuální styl uložen.")).toBeVisible();

    // And it survives a reload.
    await page.reload();
    await expect(page.getByRole("radio", { name: /Zelený bar/ })).toBeChecked();
    await expect(page.getByRole("radio", { name: /Klasický/ })).not.toBeChecked();
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

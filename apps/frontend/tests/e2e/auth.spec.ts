import { expect, test, type Locator, type Page } from "@playwright/test";

import { PASSWORD, signUp, uniqueEmail } from "./helpers/owner";

/**
 * Scoped to the form: Next's route announcer is also `role="alert"`, so an
 * unscoped lookup matches two elements and fails on strict mode.
 */
function formAlert(page: Page): Locator {
  return page.locator("main").getByRole("alert");
}

/**
 * User Story 1: an owner can create an account, sign out, and sign back in to
 * find their workspace waiting.
 */

test.describe("sign-up and sign-in", () => {
  test("registers a new owner and lands in an empty workspace", async ({ page }) => {
    await signUp(page);

    await expect(page.getByRole("heading", { name: "Vaše menu" })).toBeVisible();
    await expect(page.getByText("Zatím žádná menu")).toBeVisible();
  });

  test("survives a sign-out and sign-in round trip", async ({ page }) => {
    const { email } = await signUp(page);

    await page.getByRole("button", { name: "Odhlásit se" }).click();
    await page.waitForURL("**/cs/sign-in");

    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Heslo").fill(PASSWORD);
    await page.getByRole("button", { name: "Přihlásit se" }).click();

    await page.waitForURL("**/cs/workspace");
    await expect(page.getByText(`Přihlášeni jako ${email}`)).toBeVisible();
  });

  test("locks the workspace once signed out", async ({ page }) => {
    await signUp(page);
    await page.getByRole("button", { name: "Odhlásit se" }).click();
    await page.waitForURL("**/cs/sign-in");

    await page.goto("/cs/workspace");

    // Redirected away rather than shown an empty shell.
    await expect(page).toHaveURL(/\/cs\/sign-in$/);
  });

  test("sends an anonymous visitor from the workspace to sign-in", async ({ page }) => {
    await page.goto("/cs/workspace");
    await expect(page).toHaveURL(/\/cs\/sign-in$/);
  });

  test("explains that an email is already taken", async ({ page }) => {
    const { email } = await signUp(page);
    await page.getByRole("button", { name: "Odhlásit se" }).click();
    await page.waitForURL("**/cs/sign-in");

    await page.goto("/cs/sign-up");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Heslo").fill(PASSWORD);
    await page.getByRole("button", { name: "Vytvořit účet" }).click();

    await expect(formAlert(page)).toContainText("Účet s tímto e-mailem už existuje");
  });

  test("rejects a wrong password without revealing whether the email exists", async ({ page }) => {
    const { email } = await signUp(page);
    await page.getByRole("button", { name: "Odhlásit se" }).click();
    await page.waitForURL("**/cs/sign-in");

    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Heslo").fill("definitely not the password");
    await page.getByRole("button", { name: "Přihlásit se" }).click();

    const knownEmailMessage = await formAlert(page).textContent();

    await page.goto("/cs/sign-in");
    await page.getByLabel("E-mail").fill(uniqueEmail());
    await page.getByLabel("Heslo").fill("definitely not the password");
    await page.getByRole("button", { name: "Přihlásit se" }).click();

    await expect(formAlert(page)).toHaveText(knownEmailMessage ?? "");
  });

  test("shows a field-level message for a password that is too short", async ({ page }) => {
    await page.goto("/cs/sign-up");
    await page.getByLabel("E-mail").fill(uniqueEmail());
    await page.getByLabel("Heslo").fill("short");
    await page.getByRole("button", { name: "Vytvořit účet" }).click();

    await expect(page.getByText("Použijte alespoň 8 znaků.")).toBeVisible();
  });

  test("works in English as well as Czech", async ({ page }) => {
    await signUp(page, "en");

    await expect(page.getByRole("heading", { name: "Your menus" })).toBeVisible();
    await expect(page.getByText("No menus yet")).toBeVisible();
  });
});

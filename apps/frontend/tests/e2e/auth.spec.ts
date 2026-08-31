import { expect, test, type Locator, type Page } from "@playwright/test";

import { LABELS, PASSWORD, signUp, uniqueEmail } from "./helpers/owner";

/**
 * Scoped to the form: Next's route announcer is also `role="alert"`, so an
 * unscoped lookup matches two elements and fails on strict mode.
 */
function formAlert(page: Page): Locator {
  return page.locator("main").getByRole("alert");
}

/**
 * Signing in and out. Registration has a suite of its own
 * (`registration.spec.ts`) now that it collects a restaurant profile; what is
 * left here is the credentials half of the flow.
 */
test.describe("sign-in", () => {
  test("signs an owner back in and returns them to their menus", async ({ page }) => {
    const { email } = await signUp(page);

    await page.getByRole("button", { name: LABELS.signOut }).click();
    await page.waitForURL("**/cs/sign-in");

    await page.getByLabel(LABELS.email).fill(email);
    await page.getByLabel(LABELS.password).fill(PASSWORD);
    await page.getByRole("button", { name: "Přihlásit se" }).click();

    await page.waitForURL("**/cs/workspace/menus");
    await expect(page.getByText(`Přihlášeni jako ${email}`)).toBeVisible();
  });

  test("rejects a wrong password without revealing whether the email exists", async ({ page }) => {
    const { email } = await signUp(page);
    await page.getByRole("button", { name: LABELS.signOut }).click();
    await page.waitForURL("**/cs/sign-in");

    await page.getByLabel(LABELS.email).fill(email);
    await page.getByLabel(LABELS.password).fill("definitely not the password");
    await page.getByRole("button", { name: "Přihlásit se" }).click();

    const knownEmailMessage = await formAlert(page).textContent();

    await page.goto("/cs/sign-in");
    await page.getByLabel(LABELS.email).fill(uniqueEmail());
    await page.getByLabel(LABELS.password).fill("definitely not the password");
    await page.getByRole("button", { name: "Přihlásit se" }).click();

    await expect(formAlert(page)).toHaveText(knownEmailMessage ?? "");
  });

  test("offers a way to register from the sign-in page", async ({ page }) => {
    await page.goto("/cs/sign-in");

    await page.getByRole("link", { name: "Vytvořte si ho" }).click();
    await expect(page).toHaveURL(/\/cs\/sign-up$/);
  });

  test("works in English as well as Czech", async ({ page }) => {
    const { email } = await signUp(page, "en");

    await page.getByRole("button", { name: LABELS.signOut }).click();
    await page.waitForURL("**/en/sign-in");

    await page.getByLabel(LABELS.email).fill(email);
    await page.getByLabel(LABELS.password).fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    await page.waitForURL("**/en/workspace/menus");
    await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
  });
});

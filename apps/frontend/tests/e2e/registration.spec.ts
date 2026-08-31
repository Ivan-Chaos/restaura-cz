import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  dismissCookieNotice,
  fillProfile,
  LABELS,
  PASSWORD,
  PROFILE,
  signUp,
  uniqueEmail,
} from "./helpers/owner";

/**
 * User Story 1: registration collects the restaurant's identity, and nothing
 * short of a complete, valid form gets anyone to a dashboard.
 */

/**
 * Scoped to the form: Next's route announcer is also `role="alert"`, so an
 * unscoped lookup matches two elements and fails on strict mode.
 */
function formAlert(page: Page): Locator {
  return page.locator("main").getByRole("alert");
}

async function openSignUp(page: Page, locale = "cs"): Promise<void> {
  await page.goto(`/${locale}/sign-up`);
  await dismissCookieNotice(page);
}

async function fillCredentials(
  page: Page,
  { email = uniqueEmail(), password = PASSWORD, confirm = PASSWORD } = {},
): Promise<string> {
  await page.getByLabel(LABELS.email).fill(email);
  await page.getByLabel(LABELS.password).fill(password);
  await page.getByLabel(LABELS.confirmPassword).fill(confirm);
  return email;
}

test.describe("registration", () => {
  test("registers an owner with a full restaurant profile (AS1)", async ({ page }) => {
    const owner = await signUp(page);

    await expect(page).toHaveURL(/\/cs\/workspace\/menus$/);
    await expect(page.getByText(`Přihlášeni jako ${owner.email}`)).toBeVisible();
  });

  test("keeps the profile across a sign-out and sign-in round trip (AS6)", async ({ page }) => {
    const { email } = await signUp(page);

    await page.getByRole("button", { name: LABELS.signOut }).click();
    await page.waitForURL("**/cs/sign-in");

    await page.getByLabel(LABELS.email).fill(email);
    await page.getByLabel(LABELS.password).fill(PASSWORD);
    await page.getByRole("button", { name: "Přihlásit se" }).click();

    await page.waitForURL("**/cs/workspace/menus");
    await page.goto("/cs/workspace/settings/profile");
    await expect(page.getByLabel(LABELS.restaurantName)).toHaveValue(PROFILE.restaurantName);
    await expect(page.getByLabel(LABELS.location)).toHaveValue(PROFILE.location);
  });

  test("refuses a password that does not match its confirmation (AS2)", async ({ page }) => {
    await openSignUp(page);
    await fillCredentials(page, { confirm: "something else entirely" });
    await fillProfile(page);

    await page.getByRole("button", { name: LABELS.createAccount }).click();

    await expect(page.getByText("Hesla se neshodují.")).toBeVisible();
    // Nothing was created, so nothing moved.
    await expect(page).toHaveURL(/\/cs\/sign-up$/);
  });

  test.describe("blocks an incomplete form with a message on the offending field (AS3)", () => {
    test("a missing restaurant name", async ({ page }) => {
      await openSignUp(page);
      await fillCredentials(page);
      await fillProfile(page, { restaurantName: "" });

      await page.getByRole("button", { name: LABELS.createAccount }).click();

      await expect(page.getByText("Zadejte název restaurace, nejvýše 120 znaků.")).toBeVisible();
      await expect(page).toHaveURL(/\/cs\/sign-up$/);
    });

    test("a phone number that is not one", async ({ page }) => {
      await openSignUp(page);
      await fillCredentials(page);
      await fillProfile(page, { phone: "zavolejte mi" });

      await page.getByRole("button", { name: LABELS.createAccount }).click();

      await expect(page.getByText("Zadejte platné telefonní číslo.")).toBeVisible();
      await expect(page).toHaveURL(/\/cs\/sign-up$/);
    });

    test("no phone number at all", async ({ page }) => {
      await openSignUp(page);
      await fillCredentials(page);
      await fillProfile(page, { phone: "" });

      await page.getByRole("button", { name: LABELS.createAccount }).click();

      await expect(page.getByText("Přidejte alespoň jedno telefonní číslo.")).toBeVisible();
    });

    test("a missing address", async ({ page }) => {
      await openSignUp(page);
      await fillCredentials(page);
      await fillProfile(page, { location: "" });

      await page.getByRole("button", { name: LABELS.createAccount }).click();

      await expect(page.getByText("Zadejte adresu restaurace, nejvýše 200 znaků.")).toBeVisible();
    });

    test("a password below the minimum length", async ({ page }) => {
      await openSignUp(page);
      await fillCredentials(page, { password: "short", confirm: "short" });
      await fillProfile(page);

      await page.getByRole("button", { name: LABELS.createAccount }).click();

      await expect(page.getByText("Použijte alespoň 8 znaků.")).toBeVisible();
    });
  });

  test("adds and removes phone numbers, always keeping one (AS4)", async ({ page }) => {
    await openSignUp(page);

    const phoneInputs = page.getByRole("textbox", { name: /telefonní číslo/i });
    await expect(phoneInputs).toHaveCount(1);

    // One number needs no removal control; the moment there are two, both do.
    await expect(page.getByRole("button", { name: /odebrat telefonní číslo/i })).toHaveCount(0);

    await page.getByRole("button", { name: LABELS.addPhone }).click();
    await expect(phoneInputs).toHaveCount(2);

    await page.getByRole("button", { name: LABELS.addPhone }).click();
    await expect(phoneInputs).toHaveCount(3);
    // Three is the cap.
    await expect(page.getByRole("button", { name: LABELS.addPhone })).toHaveCount(0);

    await page.getByRole("button", { name: /odebrat telefonní číslo/i }).first().click();
    await expect(phoneInputs).toHaveCount(2);
  });

  test("stores every phone number the owner entered", async ({ page }) => {
    await openSignUp(page);
    await fillCredentials(page);
    await fillProfile(page);

    await page.getByRole("button", { name: LABELS.addPhone }).click();
    await page.getByLabel(/telefonní číslo 2/i).fill("222 333 444");
    await page.getByRole("button", { name: LABELS.createAccount }).click();

    await page.waitForURL("**/cs/workspace/menus");
    await page.goto("/cs/workspace/settings/profile");

    await expect(page.getByLabel(/telefonní číslo 1/i)).toHaveValue(PROFILE.phone);
    await expect(page.getByLabel(/telefonní číslo 2/i)).toHaveValue("222 333 444");
  });

  test("explains that an email is already taken and offers sign-in (AS5)", async ({ page }) => {
    const { email } = await signUp(page);
    await page.getByRole("button", { name: LABELS.signOut }).click();
    await page.waitForURL("**/cs/sign-in");

    await openSignUp(page);
    await fillCredentials(page, { email });
    await fillProfile(page);
    await page.getByRole("button", { name: LABELS.createAccount }).click();

    await expect(formAlert(page)).toContainText("Účet s tímto e-mailem už existuje");
    await expect(page.getByRole("link", { name: "Přihlaste se" })).toBeVisible();
  });

  test("works in English as well as Czech", async ({ page }) => {
    await signUp(page, "en");

    await expect(page).toHaveURL(/\/en\/workspace\/menus$/);
    await expect(page.getByText("No menus yet")).toBeVisible();
  });
});

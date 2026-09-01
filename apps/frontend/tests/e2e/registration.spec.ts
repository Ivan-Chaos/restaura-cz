import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  confirmEmail,
  dismissCookieNotice,
  fillProfile,
  LABELS,
  PASSWORD,
  PROFILE,
  SECOND_PHONE,
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

    test("a phone number with too few digits to be one", async ({ page }) => {
      await openSignUp(page);
      await fillCredentials(page);
      await fillProfile(page, { phone: "12" });

      await page.getByRole("button", { name: LABELS.createAccount }).click();

      await expect(page.getByText("Zadejte platné telefonní číslo.")).toBeVisible();
      await expect(page).toHaveURL(/\/cs\/sign-up$/);
    });

    /**
     * Letters never reach the value at all — the masked field keeps the digits
     * and drops the rest — so this fails as a missing number rather than an
     * invalid one. Asserted because it is the behaviour, not an accident of it.
     */
    test("letters typed into the phone field, which the mask refuses", async ({ page }) => {
      await openSignUp(page);
      await fillCredentials(page);
      await fillProfile(page, { phone: "zavolejte mi" });

      await expect(page.getByLabel(LABELS.phone)).toHaveValue("");

      await page.getByRole("button", { name: LABELS.createAccount }).click();
      await expect(page.getByText("Přidejte alespoň jedno telefonní číslo.")).toBeVisible();
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
    const email = await fillCredentials(page);
    await fillProfile(page);

    await page.getByRole("button", { name: LABELS.addPhone }).click();
    await page.getByLabel(/telefonní číslo 2/i).fill(SECOND_PHONE.typed);
    await page.getByRole("button", { name: LABELS.createAccount }).click();

    await page.waitForURL("**/cs/verify-email**");
    await confirmEmail(page, email);

    await page.waitForURL("**/cs/workspace/menus");
    await page.goto("/cs/workspace/settings/profile");

    await expect(page.getByLabel(/telefonní číslo 1/i)).toHaveValue(PROFILE.phoneFormatted);
    await expect(page.getByLabel(/telefonní číslo 2/i)).toHaveValue(SECOND_PHONE.formatted);
  });

  /**
   * The longest form in the product must not empty itself because of one bad
   * field. React resets an uncontrolled form once its action completes, so a
   * taken email used to take the restaurant name, phones and address with it —
   * asking the owner to retype all of it to fix something else entirely.
   */
  test("keeps everything typed when the API rejects the email (AS5)", async ({ page }) => {
    const { email } = await signUp(page);
    await page.getByRole("button", { name: LABELS.signOut }).click();
    await page.waitForURL("**/cs/sign-in");

    await openSignUp(page);
    await fillCredentials(page, { email });
    await fillProfile(page);
    await page.getByRole("button", { name: LABELS.createAccount }).click();

    await expect(formAlert(page)).toContainText("Účet s tímto e-mailem už existuje");

    // Everything is still there to correct.
    await expect(page.getByLabel(LABELS.email)).toHaveValue(email);
    await expect(page.getByLabel(LABELS.restaurantName)).toHaveValue(PROFILE.restaurantName);
    await expect(page.getByLabel(LABELS.phone)).toHaveValue(PROFILE.phoneFormatted);
    await expect(page.getByLabel(LABELS.location)).toHaveValue(PROFILE.location);
    await expect(page.getByLabel(LABELS.password)).toHaveValue(PASSWORD);
  });

  /**
   * Caught in the browser, so the form never posts: the URL does not change and
   * no request is spent learning what the field already showed.
   */
  test("marks a malformed email without leaving the page", async ({ page }) => {
    await openSignUp(page);
    await page.getByLabel(LABELS.email).fill("not-an-email");
    await page.getByLabel(LABELS.password).fill(PASSWORD);
    await page.getByLabel(LABELS.confirmPassword).fill(PASSWORD);
    await fillProfile(page);

    await page.getByRole("button", { name: LABELS.createAccount }).click();

    await expect(page.getByText("Zadejte platnou e-mailovou adresu.")).toBeVisible();
    await expect(page).toHaveURL(/\/cs\/sign-up$/);
  });

  /** A message must clear as the owner fixes the field, not linger until submit. */
  test("clears a field's message once it is corrected", async ({ page }) => {
    await openSignUp(page);
    await page.getByLabel(LABELS.email).fill("not-an-email");
    await fillProfile(page);
    await page.getByRole("button", { name: LABELS.createAccount }).click();

    const message = page.getByText("Zadejte platnou e-mailovou adresu.");
    await expect(message).toBeVisible();

    await page.getByLabel(LABELS.email).fill("owner@example.com");
    await expect(message).toHaveCount(0);
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

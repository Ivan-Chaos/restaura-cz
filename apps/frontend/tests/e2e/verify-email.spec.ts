import { expect, test, type Locator, type Page } from "@playwright/test";

import { setConfirmationCode } from "./helpers/database";
import {
  confirmEmail,
  CONFIRMATION_CODE,
  LABELS,
  PASSWORD,
  register,
  signUp,
} from "./helpers/owner";

/**
 * Email confirmation: the account exists and is signed in, but nothing else
 * opens until the owner proves they can read the address they gave.
 */

/** Scoped to the form: Next's route announcer is also `role="alert"`. */
function formAlert(page: Page): Locator {
  return page.locator("main").getByRole("alert");
}

test.describe("email confirmation", () => {
  test("sends a newly registered owner to the code screen, not the dashboard", async ({
    page,
  }) => {
    const { email } = await register(page);

    await expect(page).toHaveURL(/\/cs\/verify-email/);
    // The address is shown so the owner can spot a typo before hunting an inbox.
    await expect(page.getByText(email)).toBeVisible();
    await expect(page.getByLabel(LABELS.confirmationCode)).toBeVisible();
  });

  test("opens the dashboard once the code is entered", async ({ page }) => {
    const { email } = await register(page);

    await confirmEmail(page, email);

    await page.waitForURL("**/cs/workspace/menus");
    await expect(page.getByText(`Přihlášeni jako ${email}`)).toBeVisible();
  });

  test("refuses a wrong code and stays put", async ({ page }) => {
    await register(page);

    await page.getByLabel(LABELS.confirmationCode).fill("000000");
    await page.getByRole("button", { name: LABELS.confirmEmail }).click();

    await expect(formAlert(page)).toContainText("Tento kód není správný");
    await expect(page).toHaveURL(/\/cs\/verify-email/);
  });

  /**
   * The six slots must empty after a rejection. Leaving them full strands the
   * owner: the input is at its maxLength, so typing the right code over the
   * wrong one does nothing at all.
   */
  test("clears the field after a rejection so the next code can be typed", async ({
    page,
  }) => {
    const { email } = await register(page);

    const input = page.getByLabel(LABELS.confirmationCode);
    await input.fill("000000");
    await page.getByRole("button", { name: LABELS.confirmEmail }).click();
    await expect(formAlert(page)).toContainText("Tento kód není správný");

    await expect(input).toHaveValue("");

    // And the right code now goes in and works.
    await confirmEmail(page, email);
    await page.waitForURL("**/cs/workspace/menus");
  });

  /** Caught in the browser: five digits is not a code, so nothing is submitted. */
  test("marks a code that is too short without submitting it", async ({ page }) => {
    await register(page);

    const input = page.getByLabel(LABELS.confirmationCode);
    await input.fill("12345");
    await page.getByRole("button", { name: LABELS.confirmEmail }).click();

    await expect(input).toHaveAttribute("aria-invalid", "true");
    // The API's own verdict never appears, which is how we know the browser
    // stopped the submission rather than the server rejecting it.
    await expect(page.getByText("Tento kód není správný")).toHaveCount(0);
    await expect(page).toHaveURL(/\/cs\/verify-email/);
  });

  test("holds the resend button until the cooldown has elapsed", async ({ page }) => {
    await register(page);

    // A code was just sent by registering, so asking again immediately is what
    // the cooldown exists to prevent.
    await expect(
      page.getByRole("button", { name: LABELS.resendCountdown }),
    ).toBeDisabled();
  });

  test("keeps an unconfirmed owner out of the workspace", async ({ page }) => {
    await register(page);

    await page.goto("/cs/workspace/menus");

    // Bounced back, with the destination preserved so confirming lands there.
    await expect(page).toHaveURL(/\/cs\/verify-email\?next=%2Fworkspace%2Fmenus$/);
  });

  test("returns an unconfirmed owner to the code screen on sign-in", async ({ page }) => {
    const { email } = await register(page);

    // Signing out from the confirmation screen is the escape hatch for a
    // mistyped address.
    await page.getByRole("button", { name: /odhlaste se|sign out|melden sie sich ab/i }).click();
    await page.waitForURL("**/cs/sign-in");

    await page.getByLabel(LABELS.email).fill(email);
    await page.getByLabel(LABELS.password).fill(PASSWORD);
    await page.getByRole("button", { name: "Přihlásit se" }).click();

    await expect(page).toHaveURL(/\/cs\/verify-email/);
  });

  test("sends a confirmed owner straight past the code screen", async ({ page }) => {
    await signUp(page);

    await page.goto("/cs/verify-email");

    // Nothing left to confirm, so the page must not trap them.
    await page.waitForURL("**/cs/workspace/menus");
  });

  test("confirming twice is not an error", async ({ page }) => {
    const { email } = await register(page);
    await confirmEmail(page, email);
    await page.waitForURL("**/cs/workspace/menus");

    // A stale tab, or the back button, resubmitting the same code.
    await setConfirmationCode(email, CONFIRMATION_CODE).catch(() => {
      // The row is gone after a successful confirmation, which is the point.
    });
    await page.goto("/cs/verify-email");

    await page.waitForURL("**/cs/workspace/menus");
  });

  test("works in English as well as Czech", async ({ page }) => {
    const { email } = await register(page, "en");

    await expect(page.getByRole("heading", { name: "Confirm your email" })).toBeVisible();

    await confirmEmail(page, email);
    await page.waitForURL("**/en/workspace/menus");
  });
});

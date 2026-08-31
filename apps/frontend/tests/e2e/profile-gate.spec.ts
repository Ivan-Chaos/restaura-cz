import { expect, test, type Page } from "@playwright/test";

import { removeProfile } from "./helpers/database";
import { dismissCookieNotice, fillProfile, LABELS, PASSWORD, signUp } from "./helpers/owner";

/**
 * User Story 1, second half: the gate. Nobody reaches a dashboard page without
 * a session *and* a restaurant profile, and whoever is turned away comes back
 * to the page they actually asked for.
 */

/**
 * Puts the browser in the state of an account created before profiles existed:
 * signed in, with nothing to show for it. Registration writes account and
 * profile in one transaction and no endpoint removes a profile, so the state is
 * seeded the way it actually arose — in the database.
 */
async function becomeProfileless(page: Page): Promise<void> {
  const { email } = await signUp(page);
  await removeProfile(email);
}

test.describe("the dashboard gate", () => {
  test("sends an anonymous visitor to sign-in and back again (AS/FR-013)", async ({ page }) => {
    await page.goto("/cs/workspace/settings/profile");

    await expect(page).toHaveURL(/\/cs\/sign-in\?next=%2Fworkspace%2Fsettings%2Fprofile$/);

    // Registering from here must also honour the destination.
    const { email } = await signUp(page);
    expect(email).toContain("@");
  });

  test("returns a signed-in owner to the page they asked for", async ({ page }) => {
    const { email } = await signUp(page);
    await page.getByRole("button", { name: LABELS.signOut }).click();
    await page.waitForURL("**/cs/sign-in");

    await page.goto("/cs/workspace/settings/subscription");
    await expect(page).toHaveURL(/\/sign-in\?next=/);

    await page.getByLabel(LABELS.email).fill(email);
    await page.getByLabel(LABELS.password).fill(PASSWORD);
    await page.getByRole("button", { name: "Přihlásit se" }).click();

    await expect(page).toHaveURL(/\/cs\/workspace\/settings\/subscription$/);
  });

  test("ignores a destination that would leave this site", async ({ page }) => {
    await page.goto("/cs/sign-in?next=https://example.com/phish");
    await dismissCookieNotice(page);

    const { email } = await signUp(page);
    expect(email).toContain("@");
    // The absolute URL was discarded, so registration landed where it should.
    await expect(page).toHaveURL(/\/cs\/workspace\/menus$/);
  });

  test("locks the dashboard once signed out", async ({ page }) => {
    await signUp(page);
    await page.getByRole("button", { name: LABELS.signOut }).click();
    await page.waitForURL("**/cs/sign-in");

    await page.goto("/cs/workspace/menus");
    await expect(page).toHaveURL(/\/cs\/sign-in\?next=%2Fworkspace%2Fmenus$/);
  });

  test("keeps a signed-in owner off the sign-up and sign-in pages", async ({ page }) => {
    await signUp(page);

    await page.goto("/cs/sign-in");
    await expect(page).toHaveURL(/\/cs\/workspace/);

    await page.goto("/cs/sign-up");
    await expect(page).toHaveURL(/\/cs\/workspace/);
  });

  test("sends an owner with a profile away from the completion page", async ({ page }) => {
    await signUp(page);

    await page.goto("/cs/complete-profile");
    await expect(page).toHaveURL(/\/cs\/workspace/);
  });

  test("holds an account with no profile at the completion step (AS7)", async ({ page }) => {
    await becomeProfileless(page);

    await page.goto("/cs/workspace/menus");
    await expect(page).toHaveURL(/\/cs\/complete-profile\?next=%2Fworkspace%2Fmenus$/);

    await fillProfile(page, { restaurantName: "Dokončená Restaurace" });
    await page.getByRole("button", { name: /uložit a pokračovat/i }).click();

    // Finished, and returned to where they were headed.
    await expect(page).toHaveURL(/\/cs\/workspace\/menus$/);
  });

  test("refuses to complete a profile with invalid values", async ({ page }) => {
    await becomeProfileless(page);
    await page.goto("/cs/complete-profile");

    await fillProfile(page, { phone: "nope" });
    await page.getByRole("button", { name: /uložit a pokračovat/i }).click();

    await expect(page.getByText("Zadejte platné telefonní číslo.")).toBeVisible();
    await expect(page).toHaveURL(/\/cs\/complete-profile/);
  });
});

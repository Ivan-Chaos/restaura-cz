import { expect, test } from "@playwright/test";

import {
  LABELS,
  PASSWORD,
  PROFILE,
  SECOND_PHONE,
  signUp,
} from "./helpers/owner";

/**
 * User Story 4: settings is its own page with addressable tabs, one of which
 * edits the restaurant profile and one of which is where subscriptions will be
 * managed.
 */
test.describe("settings", () => {
  test("opens on the restaurant tab (AS1)", async ({ page }) => {
    await signUp(page);

    await page.getByRole("link", { name: "Nastavení" }).click();

    await expect(page).toHaveURL(/\/cs\/workspace\/settings\/profile$/);
    await expect(page.getByRole("heading", { name: "Nastavení" })).toBeVisible();
  });

  test("switches tabs, changing the address as it goes (AS2)", async ({ page }) => {
    await signUp(page);
    await page.goto("/cs/workspace/settings");

    await expect(page).toHaveURL(/\/settings\/profile$/);

    await page.getByRole("link", { name: "Předplatné" }).click();
    await expect(page).toHaveURL(/\/settings\/subscription$/);
    await expect(page.getByRole("link", { name: "Předplatné" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    await page.getByRole("link", { name: "Restaurace" }).click();
    await expect(page).toHaveURL(/\/settings\/profile$/);
  });

  test("opens a tab directly from its own address (AS3)", async ({ page }) => {
    await signUp(page);

    await page.goto("/cs/workspace/settings/subscription");

    await expect(page.getByText("Předběžný přístup")).toBeVisible();
    await expect(page.getByRole("link", { name: "Předplatné" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("shows the current plan, read-only for now (AS4)", async ({ page }) => {
    await signUp(page);
    await page.goto("/cs/workspace/settings/subscription");

    await expect(page.getByText("Předběžný přístup")).toBeVisible();
    await expect(page.getByText("Aktivní")).toBeVisible();
  });

  test("saves a profile edit and keeps it across sessions (AS3, SC-007)", async ({ page }) => {
    const { email } = await signUp(page);
    await page.goto("/cs/workspace/settings/profile");

    await page.getByLabel(LABELS.restaurantName).fill("Restaurace U Lípy");
    await page.getByLabel(LABELS.location).fill("Vinohradská 5, Praha 2");
    await page.getByRole("button", { name: LABELS.addPhone }).click();
    await page.getByLabel(/telefonní číslo 2/i).fill(SECOND_PHONE.typed);
    await page.getByRole("button", { name: "Uložit změny" }).click();

    await expect(page.getByText("Uloženo")).toBeVisible();

    // Round-trip through a fresh session: the values must be the stored ones.
    await page.getByRole("button", { name: LABELS.signOut }).click();
    await page.waitForURL("**/cs/sign-in");
    await page.getByLabel(LABELS.email).fill(email);
    await page.getByLabel(LABELS.password).fill(PASSWORD);
    await page.getByRole("button", { name: "Přihlásit se" }).click();
    await page.waitForURL("**/cs/workspace/menus");

    await page.goto("/cs/workspace/settings/profile");
    await expect(page.getByLabel(LABELS.restaurantName)).toHaveValue("Restaurace U Lípy");
    await expect(page.getByLabel(LABELS.location)).toHaveValue("Vinohradská 5, Praha 2");
    await expect(page.getByLabel(/telefonní číslo 2/i)).toHaveValue(SECOND_PHONE.formatted);
  });

  /** FR-020: a rejected edit must not overwrite what is stored. */
  test("refuses an empty restaurant name and leaves the stored one alone", async ({ page }) => {
    await signUp(page);
    await page.goto("/cs/workspace/settings/profile");

    await page.getByLabel(LABELS.restaurantName).fill("");
    await page.getByRole("button", { name: "Uložit změny" }).click();

    await expect(page.getByText("Zadejte název restaurace, nejvýše 120 znaků.")).toBeVisible();
    await expect(page.getByText("Uloženo")).toHaveCount(0);

    await page.reload();
    await expect(page.getByLabel(LABELS.restaurantName)).toHaveValue(PROFILE.restaurantName);
  });

  test("refuses to drop the last phone number", async ({ page }) => {
    await signUp(page);
    await page.goto("/cs/workspace/settings/profile");

    await page.getByLabel(/telefonní číslo 1/i).fill("");
    await page.getByRole("button", { name: "Uložit změny" }).click();

    await expect(page.getByText("Přidejte alespoň jedno telefonní číslo.")).toBeVisible();

    await page.reload();
    await expect(page.getByLabel(/telefonní číslo 1/i)).toHaveValue(PROFILE.phoneFormatted);
  });

  test("removes a phone number the owner deleted", async ({ page }) => {
    await signUp(page);
    await page.goto("/cs/workspace/settings/profile");

    await page.getByRole("button", { name: LABELS.addPhone }).click();
    await page.getByLabel(/telefonní číslo 2/i).fill(SECOND_PHONE.typed);
    await page.getByRole("button", { name: "Uložit změny" }).click();
    await expect(page.getByText("Uloženo")).toBeVisible();

    await page.reload();
    await page.getByRole("button", { name: /odebrat telefonní číslo 2/i }).click();
    await page.getByRole("button", { name: "Uložit změny" }).click();
    await expect(page.getByText("Uloženo")).toBeVisible();

    await page.reload();
    await expect(page.getByRole("textbox", { name: /telefonní číslo/i })).toHaveCount(1);
  });

  test("works in English as well as Czech", async ({ page }) => {
    await signUp(page, "en");
    await page.goto("/en/workspace/settings");

    await expect(page).toHaveURL(/\/en\/workspace\/settings\/profile$/);
    await expect(page.getByRole("link", { name: "Subscription" })).toBeVisible();
  });

  /**
   * The logo lives on the restaurant tab (feature 006).
   *
   * Only its presence is asserted here. Uploading, framing, replacing and
   * removing it are proved in `images.spec.ts`, and that the two saves leave
   * each other alone is proved directly against the database in the API suite —
   * both of which are steadier places for it than a page whose two independent
   * saves would have to be raced here.
   */
  test("offers the logo on the restaurant tab (US1)", async ({ page }) => {
    await signUp(page);
    await page.goto("/cs/workspace/settings/profile");

    await expect(page.getByRole("heading", { name: "Logo" })).toBeVisible();
    await expect(page.getByRole("button", { name: /nahrát logo/i })).toBeVisible();
    // Says what it accepts before anyone picks wrongly.
    await expect(page.getByText(/10 MB/)).toBeVisible();
    // The details form is still its own, separate save.
    await expect(page.getByRole("button", { name: "Uložit změny" })).toBeVisible();
  });
});

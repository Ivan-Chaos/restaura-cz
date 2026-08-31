import { expect, type Locator, type Page } from "@playwright/test";

import cs from "../../../messages/cs.json";
import de from "../../../messages/de.json";
import en from "../../../messages/en.json";

const BANNER_LABELS = [cs.Legal.banner.label, en.Legal.banner.label, de.Legal.banner.label];

/**
 * The cookie notice is fixed to the bottom of every page, so it sits over the
 * editor's own controls. A visitor dismisses it once; these tests do the same
 * rather than clicking through it.
 */
export async function dismissCookieNotice(page: Page): Promise<void> {
  for (const label of BANNER_LABELS) {
    const notice = page.getByRole("region", { name: label });
    if ((await notice.count()) === 0) continue;

    // The decision is remembered in a cookie, so on a second visit within the
    // same context the notice may already be on its way out. Finding it is not
    // a promise that it will still be there a moment later.
    const dismiss = notice.getByRole("button").first();
    try {
      await dismiss.click({ timeout: 5_000 });
    } catch {
      await expect(notice).toHaveCount(0);
      return;
    }

    await expect(notice).toHaveCount(0);
    return;
  }
}

/**
 * Helpers for the owner-facing suites.
 *
 * Every test registers its own account with a unique email, so the suites share
 * a database without sharing state and can still run in parallel.
 */

export function uniqueEmail(): string {
  return `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

export const PASSWORD = "correct horse battery";

export interface Owner {
  email: string;
  restaurantName: string;
}

/** A valid profile, for the suites whose subject is something other than it. */
export const PROFILE = {
  restaurantName: "U Zlaté Lípy",
  phone: "+420 601 234 567",
  location: "Náměstí Míru 12, 120 00 Praha 2",
};

export const LABELS = {
  email: /e-?mail/i,
  password: /^(heslo|password|passwort)$/i,
  confirmPassword: /potvrzení hesla|confirm password|passwort bestätigen/i,
  restaurantName: /název restaurace|restaurant name|name des restaurants/i,
  phone: /telefonní číslo 1|phone number 1|telefonnummer 1/i,
  location: /^(adresa|address|adresse)$/i,
  createAccount: /vytvořit účet|create account|konto erstellen/i,
  addPhone: /přidat další číslo|add another number|weitere nummer hinzufügen/i,
  signOut: /odhlásit se|sign out|abmelden/i,
};

/** Fills the restaurant half of the registration or completion form. */
export async function fillProfile(
  page: Page,
  overrides: Partial<typeof PROFILE> = {},
): Promise<void> {
  const values = { ...PROFILE, ...overrides };
  await page.getByLabel(LABELS.restaurantName).fill(values.restaurantName);
  await page.getByLabel(LABELS.phone).fill(values.phone);
  await page.getByLabel(LABELS.location).fill(values.location);
}

/** Registers a new owner and leaves the page on their menus. */
export async function signUp(page: Page, locale = "cs"): Promise<Owner> {
  const email = uniqueEmail();

  await page.goto(`/${locale}/sign-up`);
  await dismissCookieNotice(page);
  await page.getByLabel(LABELS.email).fill(email);
  await page.getByLabel(LABELS.password).fill(PASSWORD);
  await page.getByLabel(LABELS.confirmPassword).fill(PASSWORD);
  await fillProfile(page);
  await page.getByRole("button", { name: LABELS.createAccount }).click();

  await page.waitForURL(`**/${locale}/workspace/menus`);
  return { email, restaurantName: PROFILE.restaurantName };
}

/** Creates a menu from the menus section and returns its editor URL. */
export async function createMenu(page: Page, name: string, locale = "cs"): Promise<string> {
  await page.goto(`/${locale}/workspace/menus`);
  await page
    .getByRole("textbox", { name: /název menu|menu name|name der speisekarte/i })
    .fill(name);
  await page
    .getByRole("button", { name: /vytvořit menu|create menu|speisekarte erstellen/i })
    .click();

  await page.waitForURL(/\/workspace\/menus\/[0-9a-f-]{36}$/);
  return page.url();
}

/**
 * The card for one section. Each card is a landmark named by its title, so this
 * picks out exactly one — unlike filtering on `<section>`, which also matches
 * the wrapper holding every card.
 */
export function sectionCard(page: Page, title: string): Locator {
  return page.getByRole("region", { name: title, exact: true });
}

export async function addSection(page: Page, title: string): Promise<void> {
  await page
    .getByRole("textbox", { name: /název nové sekce|new section title|titel des neuen bereichs/i })
    .fill(title);
  await page
    .getByRole("button", { name: /přidat sekci|add section|bereich hinzufügen/i })
    .click();

  await expect(page.locator(`input[value="${title}"]`)).toBeVisible();
}

export async function addItem(
  page: Page,
  section: string,
  item: { name: string; description?: string; price: string },
): Promise<void> {
  const card = sectionCard(page, section);

  await card
    .getByRole("textbox", { name: /název jídla|dish name|name des gerichts/i })
    .fill(item.name);
  if (item.description) {
    await card
      .getByRole("textbox", { name: /^(popis|description|beschreibung)$/i })
      .fill(item.description);
  }
  await card.getByRole("textbox", { name: /^(cena|price|preis)$/i }).fill(item.price);
  await card.getByRole("button", { name: /přidat jídlo|add dish|gericht hinzufügen/i }).click();

  await expect(card.getByText(item.name, { exact: true })).toBeVisible();
}

/** Publishes the open menu and returns the public address it reports. */
export async function publish(page: Page): Promise<string> {
  await page.getByRole("button", { name: /^(zveřejnit|publish|veröffentlichen)$/i }).click();

  const address = page.locator("code");
  await expect(address).toBeVisible();

  const url = await address.textContent();
  if (!url) throw new Error("Publishing did not report a public address");
  return url.trim();
}

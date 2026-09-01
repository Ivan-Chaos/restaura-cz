import { expect, type Locator, type Page } from "@playwright/test";

import cs from "../../../messages/cs.json";
import de from "../../../messages/de.json";
import en from "../../../messages/en.json";

import { setConfirmationCode } from "./database";

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

/**
 * A valid profile, for the suites whose subject is something other than it.
 *
 * The phone number has three forms now that the field is masked, and mixing
 * them up is the easiest way to write a test that passes for the wrong reason:
 * the owner types digits, the field shows them grouped, and the profile stores
 * the number with its dialling code.
 */
export const PROFILE = {
  restaurantName: "U Zlaté Lípy",
  /** What gets typed. The country picker owns the `+420`, so this is national. */
  phone: "601234567",
  /** What the field shows once `AsYouType` has grouped it. */
  phoneFormatted: "601 234 567",
  /** What the API is sent and what a menu prints. */
  phoneStored: "+420 601 234 567",
  location: "Náměstí Míru 12, 120 00 Praha 2",
};

/** A second number, in the same three forms. */
export const SECOND_PHONE = {
  typed: "222333444",
  formatted: "222 333 444",
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
  confirmationCode: /potvrzovací kód|confirmation code|bestätigungscode/i,
  confirmEmail: /potvrdit e-mail|confirm email|e-mail bestätigen/i,
  resendCode: /poslat kód znovu|send a new code|neuen code senden/i,
  resendCountdown: /poslat znovu za|resend in|erneut senden in/i,
};

/**
 * The code the suites confirm with. Any six digits will do — what matters is
 * that the test writes its hash into the database first, since the API never
 * reveals the code it generated.
 */
export const CONFIRMATION_CODE = "123456";

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

/**
 * Fills and submits the registration form, leaving the page on the
 * confirmation step. Split out from `signUp` for the suites whose subject is
 * confirmation itself.
 */
export async function register(page: Page, locale = "cs"): Promise<Owner> {
  const email = uniqueEmail();

  await page.goto(`/${locale}/sign-up`);
  await dismissCookieNotice(page);
  await page.getByLabel(LABELS.email).fill(email);
  await page.getByLabel(LABELS.password).fill(PASSWORD);
  await page.getByLabel(LABELS.confirmPassword).fill(PASSWORD);
  await fillProfile(page);
  await page.getByRole("button", { name: LABELS.createAccount }).click();

  await page.waitForURL(`**/${locale}/verify-email**`);
  return { email, restaurantName: PROFILE.restaurantName };
}

/**
 * Confirms an owner's email with a code the test plants.
 *
 * Ends wherever the `?next=` said, which for a fresh registration is the menus
 * page.
 */
export async function confirmEmail(page: Page, email: string): Promise<void> {
  await setConfirmationCode(email, CONFIRMATION_CODE);
  await page.getByLabel(LABELS.confirmationCode).fill(CONFIRMATION_CODE);
  await page.getByRole("button", { name: LABELS.confirmEmail }).click();
}

/**
 * Registers a new owner, confirms their email, and leaves the page on their
 * menus.
 *
 * The confirmation step is part of this helper rather than of every test,
 * because for all but the confirmation suite it is setup: the API refuses menu
 * writes from an unconfirmed account, so a test that skipped it would fail on a
 * 403 that has nothing to do with its subject.
 */
export async function signUp(page: Page, locale = "cs"): Promise<Owner> {
  const owner = await register(page, locale);

  await confirmEmail(page, owner.email);
  await page.waitForURL(`**/${locale}/workspace/menus`);

  return owner;
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

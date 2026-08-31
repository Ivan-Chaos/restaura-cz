import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { addItem, addSection, createMenu, publish, signUp } from "./helpers/owner";

/**
 * User Story 4: the guest experience. No account, no sign-in, on a phone.
 *
 * These run in a fresh browser context so nothing about the owner's session
 * leaks into what a guest is proven to see.
 */

const PHONE = { width: 375, height: 812 };

/** Publishes a small menu as an owner and returns its public address. */
async function publishSampleMenu(page: import("@playwright/test").Page): Promise<string> {
  await signUp(page);
  await createMenu(page, "U Modré kachny");

  await addSection(page, "Polévky");
  await addItem(page, "Polévky", {
    name: "Kulajda",
    description: "Se zastřeným vejcem a koprem",
    price: "89",
  });

  await addSection(page, "Hlavní jídla");
  await addItem(page, "Hlavní jídla", { name: "Svíčková na smetaně", price: "245" });

  return publish(page);
}

test.describe("public menu", () => {
  test("shows the whole menu to a guest with no account", async ({ page, browser }) => {
    const url = await publishSampleMenu(page);

    const guest = await browser.newContext();
    const guestPage = await guest.newPage();
    await guestPage.goto(url);

    await expect(guestPage.getByText("U Modré kachny")).toBeVisible();
    await expect(guestPage.getByRole("heading", { name: "Polévky" })).toBeVisible();
    await expect(guestPage.getByRole("heading", { name: "Hlavní jídla" })).toBeVisible();
    await expect(guestPage.getByText("Kulajda")).toBeVisible();
    await expect(guestPage.getByText("Se zastřeným vejcem a koprem")).toBeVisible();
    await expect(guestPage.getByText("Svíčková na smetaně")).toBeVisible();

    // Never asked to sign in.
    await expect(guestPage.getByRole("button", { name: "Přihlásit se" })).toHaveCount(0);

    await guest.close();
  });

  test("keeps sections and dishes in the order the owner set", async ({ page, browser }) => {
    const url = await publishSampleMenu(page);

    const guest = await browser.newContext();
    const guestPage = await guest.newPage();
    await guestPage.goto(url);

    const headings = await guestPage.getByRole("heading", { level: 2 }).allInnerTexts();
    expect(headings.join("|")).toContain("Polévky");
    expect(headings.indexOf("Polévky")).toBeLessThan(headings.indexOf("Hlavní jídla"));

    await guest.close();
  });

  test("reads on a phone with no sideways scrolling", async ({ page, browser }) => {
    const url = await publishSampleMenu(page);

    const guest = await browser.newContext({ viewport: PHONE });
    const guestPage = await guest.newPage();
    await guestPage.goto(url);

    await expect(guestPage.getByText("Kulajda")).toBeVisible();

    const overflows = await guestPage.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflows, "the guest menu scrolls sideways on a 375px screen").toBe(false);

    await guest.close();
  });

  test("renders in both light and dark appearance", async ({ page, browser }) => {
    const url = await publishSampleMenu(page);

    for (const colorScheme of ["light", "dark"] as const) {
      const guest = await browser.newContext({ colorScheme, viewport: PHONE });
      const guestPage = await guest.newPage();
      await guestPage.goto(url);

      await expect(guestPage.getByText("Kulajda")).toBeVisible();
      await expect(guestPage.getByText("89 Kč").first()).toBeVisible();

      await guest.close();
    }
  });

  test("has no accessibility violations", async ({ page, browser }) => {
    const url = await publishSampleMenu(page);

    const guest = await browser.newContext({ viewport: PHONE });
    const guestPage = await guest.newPage();
    await guestPage.goto(url);

    const { violations } = await new AxeBuilder({ page: guestPage })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(
      violations.map((violation) => `${violation.id}: ${violation.help}`),
      "accessibility violations on the guest menu",
    ).toEqual([]);

    await guest.close();
  });

  test("explains a link that no longer resolves", async ({ browser }) => {
    const guest = await browser.newContext();
    const guestPage = await guest.newPage();

    const response = await guestPage.goto("/cs/m/no-such-menu-aaaaaa");

    expect(response?.status()).toBe(404);
    await expect(guestPage.getByText("Toto menu není dostupné")).toBeVisible();
    await guest.close();
  });

  test("serves the guest menu in English too", async ({ page, browser }) => {
    const url = await publishSampleMenu(page);

    const guest = await browser.newContext();
    const guestPage = await guest.newPage();
    await guestPage.goto(url.replace("/cs/m/", "/en/m/"));

    await expect(guestPage.getByText("U Modré kachny")).toBeVisible();
    await expect(guestPage.getByText("Kulajda")).toBeVisible();

    await guest.close();
  });
});

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { addItem, addSection, chooseStyle, createMenu, publish, signUp } from "./helpers/owner";

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
  // A price with hellers, so the guest side is proven to carry them too.
  await addItem(page, "Hlavní jídla", { name: "Chléb", price: "12,50" });

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
    // Whole korunas print without decimals; a price that has hellers keeps them.
    await expect(guestPage.getByText("245 Kč").first()).toBeVisible();
    await expect(guestPage.getByText("12,50 Kč").first()).toBeVisible();

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

  test("renders the style the owner chose, with every dish intact", async ({
    page,
    browser,
  }) => {
    // Spec 005 US2: the picker's choice is what guests see, and the next load
    // after a change already carries it.
    const url = await publishSampleMenu(page);
    await chooseStyle(page, /Zelený bar/);

    const guest = await browser.newContext({ viewport: PHONE });
    const guestPage = await guest.newPage();
    await guestPage.goto(url);

    await expect(guestPage.locator('[data-theme="green-bar"]')).toHaveCount(1);
    await expect(guestPage.getByText("Kulajda")).toBeVisible();
    await expect(guestPage.getByText("Svíčková na smetaně")).toBeVisible();
    await expect(guestPage.getByText("245 Kč").first()).toBeVisible();
    await expect(guestPage.getByText("12,50 Kč").first()).toBeVisible();

    // Switching again is reflected on the very next request.
    await chooseStyle(page, /Vytříbený/);
    await guestPage.reload();
    await expect(guestPage.locator('[data-theme="refined"]')).toHaveCount(1);
    await expect(guestPage.getByText("Kulajda")).toBeVisible();

    await guest.close();
  });

  test("renders a menu that never chose a style as Classic", async ({ page, browser }) => {
    // Spec 005 FR-007: the stored `default` — every pre-existing menu — is warm.
    const url = await publishSampleMenu(page);

    const guest = await browser.newContext();
    const guestPage = await guest.newPage();
    await guestPage.goto(url);

    await expect(guestPage.locator('[data-theme="warm"]')).toHaveCount(1);
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

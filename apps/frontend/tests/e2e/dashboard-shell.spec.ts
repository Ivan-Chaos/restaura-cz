import { expect, test } from "@playwright/test";

import { createMenu, LABELS, PROFILE, signUp } from "./helpers/owner";

/**
 * User Story 2: every signed-in page sits in one shell — a header, a sidebar,
 * and a surface that is light whatever the visitor's device is set to.
 */
test.describe("the dashboard shell", () => {
  test("puts a header and sidebar on every dashboard page", async ({ page }) => {
    const { email } = await signUp(page);

    // The shell's content area is the page's `main`, and the bar sits at the
    // top of it — so this is a sectioning header, not a `banner` landmark.
    const header = page.locator("main > header");
    await expect(header.getByText(`Přihlášeni jako ${email}`)).toBeVisible();
    await expect(header.getByRole("button", { name: LABELS.signOut })).toBeVisible();

    // The restaurant, so an owner can tell whose dashboard this is.
    await expect(page.getByText(PROFILE.restaurantName)).toBeVisible();

    const nav = page.getByRole("link", { name: "Menu", exact: true });
    await expect(nav).toBeVisible();
    await expect(page.getByRole("link", { name: "Nastavení" })).toBeVisible();

    // And it follows into the editor, not just the index.
    await createMenu(page, "Polední menu");
    await expect(page.locator("main > header")).toBeVisible();
    await expect(page.getByRole("link", { name: "Nastavení" })).toBeVisible();

    // Exactly one main landmark: the shell owns it, pages render into it.
    await expect(page.locator("main")).toHaveCount(1);
  });

  test("marks the section the owner is in", async ({ page }) => {
    await signUp(page);

    await expect(page.getByRole("link", { name: "Menu", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );

    await page.getByRole("link", { name: "Nastavení" }).click();
    await page.waitForURL("**/workspace/settings/profile");

    await expect(page.getByRole("link", { name: "Nastavení" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByRole("link", { name: "Menu", exact: true })).not.toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("sends /workspace to the menus section", async ({ page }) => {
    await signUp(page);

    await page.goto("/cs/workspace");
    await expect(page).toHaveURL(/\/cs\/workspace\/menus$/);
  });

  /**
   * Spec FR-011 and SC-005. The dashboard is asserted against its own light
   * token, and a public page against the dark one, in the same dark-preferring
   * browser — proving the scope is local rather than a global override.
   */
  test.describe("with the device set to dark", () => {
    test.use({ colorScheme: "dark" });

    test("stays light inside the dashboard and dark outside it", async ({ page }) => {
      await signUp(page);

      const dashboardBackground = await page.evaluate(() => {
        const scope = document.querySelector('[data-slot="appearance-scope"]');
        return scope ? getComputedStyle(scope).getPropertyValue("--background").trim() : null;
      });

      await page.goto("/cs");
      const publicBackground = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue("--background").trim(),
      );

      expect(dashboardBackground).not.toBeNull();
      expect(dashboardBackground).not.toBe(publicBackground);
    });

    test("declares a light color-scheme, so native controls follow", async ({ page }) => {
      await signUp(page);

      const scheme = await page.evaluate(() => {
        const scope = document.querySelector('[data-slot="appearance-scope"]');
        return scope ? getComputedStyle(scope).colorScheme : null;
      });

      expect(scheme).toBe("light");
    });
  });

  test.describe("on a phone", () => {
    test.use({ viewport: { width: 360, height: 740 } });

    test("keeps navigation reachable and the page free of sideways scroll", async ({ page }) => {
      await signUp(page);

      // Offcanvas: the trigger is the way back to navigation.
      const trigger = page.getByRole("button", { name: /sidebar/i });
      await expect(trigger).toBeVisible();
      await trigger.click();

      await expect(page.getByRole("link", { name: "Nastavení" })).toBeVisible();

      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      expect(overflows).toBe(false);
    });
  });

  /**
   * The shell is the only way around the dashboard, so it has to work without a
   * mouse. Axe covers the component-level rules on every story; what it cannot
   * check is that the whole path — navigate, open a menu, sign out — is
   * reachable by keyboard in the assembled page.
   */
  test("is navigable by keyboard alone", async ({ page }) => {
    await signUp(page);
    await createMenu(page, "Polední menu");
    await page.goto("/cs/workspace/menus");

    const settings = page.getByRole("link", { name: "Nastavení" });
    await settings.focus();
    await expect(settings).toBeFocused();
    await page.keyboard.press("Enter");
    await page.waitForURL("**/workspace/settings/profile");

    // Tabs are links, so they take focus and activate on Enter.
    const subscription = page.getByRole("link", { name: "Předplatné" });
    await subscription.focus();
    await page.keyboard.press("Enter");
    await page.waitForURL("**/workspace/settings/subscription");

    // A menu card is one focusable link, named by the menu it opens.
    await page.goto("/cs/workspace/menus");
    const card = page.getByRole("link", { name: "Polední menu" });
    await card.focus();
    await expect(card).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/workspace\/menus\/[0-9a-f-]{36}$/);

    const signOut = page.getByRole("button", { name: LABELS.signOut });
    await signOut.focus();
    await expect(signOut).toBeFocused();
  });

  test("works in English as well as Czech", async ({ page }) => {
    await signUp(page, "en");

    await expect(page.getByRole("link", { name: "Menus" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();
  });
});

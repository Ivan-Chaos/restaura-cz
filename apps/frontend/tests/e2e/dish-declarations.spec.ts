import { expect, test } from "@playwright/test";

import { addItem, addSection, createMenu, publish, signUp } from "./helpers/owner";

/**
 * Feature 008, end to end: what an owner ticks is what a guest reads, and a
 * dish taken off the menu is off it everywhere at once.
 *
 * The declarations are checked by the value each input posts rather than by its
 * label, because the values are the wire vocabulary and are identical in every
 * locale — the labels are not, and this suite runs in Czech.
 */
test.describe("what a dish declares", () => {
  test("carries markers, allergens, warnings and heat to a guest", async ({ page, browser }) => {
    await signUp(page);
    await createMenu(page, "Polední menu");
    await addSection(page, "Polévky");
    await addItem(page, "Polévky", {
      name: "Kulajda",
      price: "89",
      dietary: ["vegetarian"],
      allergens: [3, 7],
      warnings: ["rawOrUndercooked"],
      spiceLevel: 2,
    });
    const url = await publish(page);

    const guest = await browser.newContext();
    const guestPage = await guest.newPage();
    await guestPage.goto(url);

    await expect(guestPage.getByText("Kulajda")).toBeVisible();
    // The marker's label is visually hidden on a dish but is still its
    // accessible name, which is the point of never using colour alone.
    await expect(guestPage.getByText("Vegetariánské").first()).toBeAttached();
    // Allergen numbers, as a Czech menu prints them.
    await expect(guestPage.getByText("3", { exact: true }).first()).toBeVisible();
    await expect(guestPage.getByText("7", { exact: true }).first()).toBeVisible();
    await expect(guestPage.getByRole("img", { name: /pálivost 2/i })).toBeVisible();

    await guest.close();
  });

  test("prints a legend for what the menu declares, and nothing else", async ({
    page,
    browser,
  }) => {
    await signUp(page);
    await createMenu(page, "Polední menu");
    await addSection(page, "Polévky");
    await addItem(page, "Polévky", { name: "Kulajda", price: "89", allergens: [3] });
    const url = await publish(page);

    const guest = await browser.newContext();
    const guestPage = await guest.newPage();
    await guestPage.goto(url);

    const legend = guestPage.getByRole("region", { name: /alergeny/i });
    await expect(legend).toBeVisible();
    await expect(legend.getByText("Vejce")).toBeVisible();
    // The other thirteen are not listed: a legend for allergens nobody declared
    // would tell guests something untrue.
    await expect(legend.getByText("Korýši")).toHaveCount(0);

    await guest.close();
  });

  test("prints no legend at all when the menu declares nothing", async ({ page, browser }) => {
    await signUp(page);
    await createMenu(page, "Polední menu");
    await addSection(page, "Polévky");
    await addItem(page, "Polévky", { name: "Kulajda", price: "89" });
    const url = await publish(page);

    const guest = await browser.newContext();
    const guestPage = await guest.newPage();
    await guestPage.goto(url);

    await expect(guestPage.getByText("Kulajda")).toBeVisible();
    await expect(guestPage.getByRole("region", { name: /alergeny/i })).toHaveCount(0);

    await guest.close();
  });
});

test.describe("taking a dish off the menu", () => {
  test("hides it from guests while the owner keeps it", async ({ page, browser }) => {
    await signUp(page);
    await createMenu(page, "Polední menu");
    await addSection(page, "Polévky");
    await addItem(page, "Polévky", { name: "Kulajda", price: "89" });
    await addItem(page, "Polévky", {
      name: "Zelňačka",
      price: "59",
      availability: "hidden",
    });
    const url = await publish(page);

    // The owner still has it, with its price and its place in the list — that
    // is the whole difference between hiding a dish and deleting one.
    await expect(page.getByText("Zelňačka")).toBeVisible();

    const guest = await browser.newContext();
    const guestPage = await guest.newPage();
    await guestPage.goto(url);

    await expect(guestPage.getByText("Kulajda")).toBeVisible();
    await expect(guestPage.getByText("Zelňačka")).toHaveCount(0);

    await guest.close();
  });

  test("keeps a sold-out dish on the menu, because a guest needs to read it", async ({
    page,
    browser,
  }) => {
    await signUp(page);
    await createMenu(page, "Polední menu");
    await addSection(page, "Polévky");
    await addItem(page, "Polévky", {
      name: "Dršťková",
      price: "69",
      availability: "soldOut",
    });
    const url = await publish(page);

    const guest = await browser.newContext();
    const guestPage = await guest.newPage();
    await guestPage.goto(url);

    await expect(guestPage.getByText("Dršťková")).toBeVisible();
    await expect(guestPage.getByText("Vyprodáno")).toBeVisible();

    await guest.close();
  });

  test("leaves a section whose dishes are all hidden as an empty heading", async ({
    page,
    browser,
  }) => {
    await signUp(page);
    await createMenu(page, "Polední menu");
    await addSection(page, "Polévky");
    await addItem(page, "Polévky", {
      name: "Zelňačka",
      price: "59",
      availability: "hidden",
    });
    const url = await publish(page);

    const guest = await browser.newContext();
    const guestPage = await guest.newPage();
    await guestPage.goto(url);

    // Indistinguishable from a section with nothing in it, which is correct:
    // one visible outcome, one rendering.
    await expect(guestPage.getByRole("heading", { name: "Polévky" })).toBeVisible();
    await expect(guestPage.getByText("Zelňačka")).toHaveCount(0);

    await guest.close();
  });
});

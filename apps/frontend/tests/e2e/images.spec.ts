import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  addItem,
  addSection,
  chooseImage,
  createMenu,
  dismissCookieNotice,
  ensureLargeFixtures,
  imageFixture,
  PROFILE,
  publish,
  sectionCard,
  signUp,
} from "./helpers/owner";

/**
 * User Story 1: an owner uploads, adjusts, replaces and removes their logo
 * (feature 006).
 *
 * The assertions worth having here are the ones a unit test cannot make: that a
 * refused file never reaches the network, that a saved framing survives a
 * reload, and that the whole flow is operable without a pointer.
 */

const SETTINGS = "/cs/workspace/settings/profile";

const UPLOAD_LOGO = /nahrát logo|upload logo|logo hochladen/i;
const REPLACE_LOGO = /nahradit logo|replace logo|logo ersetzen/i;
const REMOVE_LOGO = /odebrat logo|remove logo|logo entfernen/i;
const LOGO_SAVED = /logo uloženo|logo saved|logo gespeichert/i;

/**
 * Waits until an element has finished animating.
 *
 * Playwright calls an element visible as soon as it has a box, which for a
 * dialog that fades and scales in is well before it looks the way it will look.
 * Anything measuring rendered pixels has to wait for the animations to run out.
 */
async function settled(locator: Locator): Promise<void> {
  await locator.evaluate(async (element) => {
    await Promise.allSettled(
      element.getAnimations({ subtree: true }).map((animation) => animation.finished),
    );
  });
}

/** The logo as it appears in the settings preview. */
function logoPreview(page: Page) {
  return page
    .locator('[data-slot="image-field"]')
    .getByRole("img", { name: PROFILE.restaurantName });
}

async function openSettings(page: Page): Promise<void> {
  await signUp(page);
  await page.goto(SETTINGS);
  await dismissCookieNotice(page);
}

test.describe("restaurant logo", () => {
  test("uploads, frames and saves a logo that survives a reload (US1 AS1–AS3)", async ({
    page,
  }) => {
    await openSettings(page);

    // The empty state has to say what is accepted before anyone picks wrongly.
    await expect(page.getByRole("button", { name: UPLOAD_LOGO })).toBeVisible();
    await expect(page.getByText(/10 MB/)).toBeVisible();
    await expect(logoPreview(page)).toHaveCount(0);

    await chooseImage(page, imageFixture("logo-alpha.png"));

    await expect(page.getByText(LOGO_SAVED).first()).toBeVisible();
    await expect(logoPreview(page)).toBeVisible();

    // The workspace shell shows it too, so an owner sees whose dashboard this
    // is at a glance.
    const sidebarLogo = page.locator('[data-slot="sidebar"] img');
    await expect(sidebarLogo).toBeVisible();

    await page.reload();
    await expect(logoPreview(page)).toBeVisible();
  });

  test("adjusts the framing with the keyboard before confirming (US1 AS2, FR-022)", async ({
    page,
  }) => {
    await openSettings(page);

    await page.locator('input[type="file"]').first().setInputFiles(imageFixture("dish-4x3.jpg"));

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // The zoom control must be reachable and named, or the framing is
    // pointer-only.
    const zoom = dialog.getByRole("slider", { name: /přiblížení|zoom/i });
    await expect(zoom).toBeVisible();
    await zoom.focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");

    await dialog
      .getByRole("button", { name: /použít toto umístění|use this framing/i })
      .click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText(LOGO_SAVED).first()).toBeVisible();
  });

  test("keeps the previous logo when the framing is cancelled (US1 AS4)", async ({ page }) => {
    await openSettings(page);
    await chooseImage(page, imageFixture("logo-alpha.png"));
    await expect(logoPreview(page)).toBeVisible();

    const before = await logoPreview(page).getAttribute("src");

    await chooseImage(page, imageFixture("tiny.webp"), { confirm: false });
    await page.getByRole("dialog").getByRole("button", { name: /zrušit|cancel/i }).click();

    await expect(page.getByRole("dialog")).toBeHidden();
    // Nothing was uploaded, so the stored logo is untouched.
    await expect(logoPreview(page)).toHaveAttribute("src", before ?? "");
  });

  test("replaces a logo with a different image (US1 AS5)", async ({ page }) => {
    await openSettings(page);
    await chooseImage(page, imageFixture("logo-alpha.png"));

    const first = await logoPreview(page).getAttribute("src");

    await page.getByRole("button", { name: REPLACE_LOGO }).click();
    await chooseImage(page, imageFixture("tiny.webp"));

    // A replacement is stored under a new key, so the address must change —
    // that is what makes a stale cache impossible.
    await expect(logoPreview(page)).not.toHaveAttribute("src", first ?? "");
  });

  test("removes a logo after asking, and the name stands alone again (US1 AS6)", async ({
    page,
  }) => {
    await openSettings(page);
    await chooseImage(page, imageFixture("logo-alpha.png"));
    await expect(logoPreview(page)).toBeVisible();

    await page.getByRole("button", { name: REMOVE_LOGO }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: REMOVE_LOGO }).click();

    await expect(logoPreview(page)).toHaveCount(0);
    await expect(page.getByRole("button", { name: UPLOAD_LOGO })).toBeVisible();

    await page.reload();
    await expect(logoPreview(page)).toHaveCount(0);
  });

  test("refuses a file that is not an image, without a request (US1 AS7, SC-004)", async ({
    page,
  }) => {
    await openSettings(page);

    let uploaded = false;
    page.on("request", (request) => {
      if (request.method() === "POST") uploaded = true;
    });

    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles(imageFixture("not-an-image.png"));

    await expect(
      page.getByText(/JPEG, PNG nebo WebP|JPEG, PNG or WebP|JPEG-, PNG- oder WebP/i),
    ).toBeVisible();
    // No framing step: the file never got that far.
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(uploaded).toBe(false);
  });

  test("refuses a file over the size limit, without a request (US1 AS7)", async ({ page }) => {
    await ensureLargeFixtures();
    await openSettings(page);

    let uploaded = false;
    page.on("request", (request) => {
      if (request.method() === "POST") uploaded = true;
    });

    await page.locator('input[type="file"]').first().setInputFiles(imageFixture("too-big.jpg"));

    await expect(page.getByText(/do 10 MB|no larger than 10 MB|höchstens 10 MB/i)).toBeVisible();
    expect(uploaded).toBe(false);
  });

  test("the whole flow is operable without a pointer (FR-022)", async ({ page }) => {
    await openSettings(page);

    // Reaching the control by keyboard alone is the claim; the file dialog
    // itself is the operating system's, so the file is set directly once the
    // button that opens it has focus.
    await page.getByRole("button", { name: UPLOAD_LOGO }).focus();
    await expect(page.getByRole("button", { name: UPLOAD_LOGO })).toBeFocused();

    await page.locator('input[type="file"]').first().setInputFiles(imageFixture("logo-alpha.png"));

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Focus is inside the dialog, so Tab cannot wander back to the page behind.
    const focusedInDialog = await dialog.evaluate(
      (element) => element.contains(element.ownerDocument.activeElement),
    );
    expect(focusedInDialog).toBe(true);

    await dialog.getByRole("slider", { name: /přiblížení|zoom/i }).focus();
    await page.keyboard.press("ArrowRight");
    await dialog.getByRole("button", { name: /použít toto umístění|use this framing/i }).focus();
    await page.keyboard.press("Enter");

    await expect(dialog).toBeHidden();
    await expect(logoPreview(page)).toBeVisible();
  });

  /**
   * PR-004: the framing step has to be usable on what a phone camera actually
   * produces, not only on a small fixture. A 12-megapixel photograph is the
   * realistic ceiling, and decoding one is the slowest thing this flow does.
   */
  test("the framing step is usable on a phone-camera photograph (PR-004)", async ({ page }) => {
    await ensureLargeFixtures();
    await openSettings(page);

    const started = Date.now();
    await page.locator('input[type="file"]').first().setInputFiles(imageFixture("big-12mp.jpg"));

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    // Interactive, not merely present: the framing does not exist until the
    // cropper has measured the image, and the confirm button says when it does.
    const confirm = dialog.getByRole("button", {
      name: /použít toto umístění|use this framing/i,
    });
    await expect(confirm).toBeEnabled({ timeout: 10_000 });

    expect(Date.now() - started).toBeLessThan(5_000);

    // And the whole 12 MP file still saves, rather than merely opening.
    await confirm.click();
    await expect(page.getByText(LOGO_SAVED).first()).toBeVisible({ timeout: 15_000 });
  });

  test("the settings page and the open framing dialog have no accessibility violations", async ({
    page,
  }) => {
    await openSettings(page);

    // Scoped to the WCAG tags, as every other suite here is: that is the floor
    // the constitution sets and the one FR-022 names. Axe's `best-practice`
    // rules are advice, and the dashboard shell has a standing `region` finding
    // that belongs to the shell rather than to this feature.
    const tags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

    const settings = await new AxeBuilder({ page }).withTags(tags).analyze();
    expect(
      settings.violations.map((violation) => `${violation.id}: ${violation.help}`),
      "accessibility violations on the logo settings page",
    ).toEqual([]);

    await page.locator('input[type="file"]').first().setInputFiles(imageFixture("logo-alpha.png"));
    await expect(page.getByRole("dialog")).toBeVisible();
    // The dialog fades and scales in. Axe samples rendered pixels, so measuring
    // during the animation reads a half-transparent button against the backdrop
    // and reports a contrast failure that does not exist once it has settled.
    await settled(page.getByRole("dialog"));

    const withDialog = await new AxeBuilder({ page }).withTags(tags).analyze();
    expect(
      withDialog.violations.map((violation) => `${violation.id}: ${violation.help}`),
      "accessibility violations with the framing dialog open",
    ).toEqual([]);
  });
});

/**
 * User Stories 2 and 4: what a guest is served (feature 006).
 *
 * A fresh browser context each time, so nothing about the owner's session leaks
 * into what a guest is proven to see.
 */
test.describe("guests and images", () => {
  const PHONE = { width: 360, height: 780 };

  /** An owner with a logo, a published menu, and one photographed dish. */
  async function publishWithImages(
    page: Page,
    { logo = true, photo = true } = {},
  ): Promise<string> {
    await signUp(page);

    if (logo) {
      await page.goto(SETTINGS);
      await dismissCookieNotice(page);
      await chooseImage(page, imageFixture("logo-alpha.png"));
      await expect(page.getByText(LOGO_SAVED).first()).toBeVisible();
    }

    await createMenu(page, "U Modré kachny");
    await addSection(page, "Polévky");

    await addItem(page, "Polévky", { name: "Kulajda", price: "89" });
    if (photo) {
      const card = sectionCard(page, "Polévky");
      await card.getByRole("button", { name: /upravit|edit/i }).first().click();
      await chooseImage(card, imageFixture("dish-4x3.jpg"));
      await card.getByRole("button", { name: /^uložit$/i }).click();
      await expect(card.getByRole("img", { name: "Kulajda" })).toBeVisible();
    }

    // A second dish with no photograph: a mixed menu is the normal case.
    await addItem(page, "Polévky", { name: "Chléb", price: "25" });

    return publish(page);
  }

  test("shows the logo in the header, described by the restaurant (US2 AS1)", async ({
    page,
    browser,
  }) => {
    const url = await publishWithImages(page, { photo: false });

    const guest = await browser.newContext({ viewport: PHONE });
    const guestPage = await guest.newPage();
    await guestPage.goto(url);

    const logo = guestPage.getByRole("img", { name: PROFILE.restaurantName });
    await expect(logo).toBeVisible();

    // Served through the optimiser, from our own image host — never hot-linked
    // and never at the full stored size.
    const src = (await logo.getAttribute("src")) ?? "";
    expect(src).toContain("/_next/image");
    expect(decodeURIComponent(src)).toContain("/dev-images/logos/");

    await guest.close();
  });

  test("falls back to the restaurant name when there is no logo (US2 AS2)", async ({
    page,
    browser,
  }) => {
    const url = await publishWithImages(page, { logo: false, photo: false });

    const guest = await browser.newContext({ viewport: PHONE });
    const guestPage = await guest.newPage();
    await guestPage.goto(url);

    await expect(guestPage.getByRole("img", { name: PROFILE.restaurantName })).toHaveCount(0);
    // The menu still names itself, so nothing looks missing.
    await expect(guestPage.getByRole("heading", { name: "U Modré kachny" })).toBeVisible();

    await guest.close();
  });

  test("drops the logo from the guest page once it is removed (US2 AS3)", async ({
    page,
    browser,
  }) => {
    const url = await publishWithImages(page, { photo: false });

    await page.goto(SETTINGS);
    await page.getByRole("button", { name: REMOVE_LOGO }).click();
    await page.getByRole("dialog").getByRole("button", { name: REMOVE_LOGO }).click();
    await expect(logoPreview(page)).toHaveCount(0);

    const guest = await browser.newContext({ viewport: PHONE });
    const guestPage = await guest.newPage();
    await guestPage.goto(url);

    await expect(guestPage.getByRole("img", { name: PROFILE.restaurantName })).toHaveCount(0);

    await guest.close();
  });

  test("shows photographs only on the dishes that have one (US4 AS1)", async ({
    page,
    browser,
  }) => {
    const url = await publishWithImages(page);

    const guest = await browser.newContext({ viewport: PHONE });
    const guestPage = await guest.newPage();
    await guestPage.goto(url);

    // Described by the dish, which is what a guest needs read aloud.
    await expect(guestPage.getByRole("img", { name: "Kulajda" })).toBeVisible();
    // The plain dish is present, and carries no image of any kind.
    await expect(guestPage.getByText("Chléb")).toBeVisible();
    await expect(guestPage.getByRole("img", { name: "Chléb" })).toHaveCount(0);

    await guest.close();
  });

  test("never leaves a broken image, whatever a guest is served (FR-020)", async ({
    page,
    browser,
  }) => {
    const url = await publishWithImages(page);

    const guest = await browser.newContext({ viewport: PHONE });
    const guestPage = await guest.newPage();
    await guestPage.goto(url);

    // Every image the page draws has actually decoded. A broken one reports a
    // natural width of zero *after* it has finished loading — an image still in
    // flight reports the same thing and is not broken at all, so the wait for
    // `complete` is what makes this an assertion rather than a race.
    await guestPage.waitForFunction(() =>
      [...document.images].every((image) => image.complete),
    );

    const broken = await guestPage
      .locator("img")
      .evaluateAll((images) =>
        images.filter((image) => {
          const img = image as HTMLImageElement;
          return img.complete && img.naturalWidth === 0;
        }).length,
      );
    expect(broken).toBe(0);

    await guest.close();
  });

  test("stays within its layout-shift and byte budgets on a phone (PR-001, PR-002)", async ({
    page,
    browser,
  }) => {
    const url = await publishWithImages(page);

    const guest = await browser.newContext({ viewport: PHONE });
    const guestPage = await guest.newPage();

    // Measured from before navigation, so nothing that happens during load is
    // missed.
    await guestPage.addInitScript(() => {
      (window as unknown as { __cls: number }).__cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
          if (!shift.hadRecentInput) {
            (window as unknown as { __cls: number }).__cls += shift.value;
          }
        }
      }).observe({ type: "layout-shift", buffered: true });
    });

    const imageBytes = new Map<string, number>();
    guestPage.on("response", (response) => {
      if (!response.url().includes("/_next/image")) return;
      void response
        .body()
        .then((body) => imageBytes.set(response.url(), body.byteLength))
        .catch(() => undefined);
    });

    await guestPage.goto(url);
    await guestPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await guestPage.waitForLoadState("networkidle");

    const cls = await guestPage.evaluate(() => (window as unknown as { __cls: number }).__cls);
    expect(cls).toBeLessThanOrEqual(0.1);

    // Stored renditions are 1600px wide; what reaches a 360px phone must be a
    // fraction of that, or the budget means nothing.
    for (const [url_, bytes] of imageBytes) {
      expect(bytes, `${url_} is larger than the phone budget`).toBeLessThanOrEqual(
        120 * 1024,
      );
    }

    await guest.close();
  });
});

/**
 * User Story 3: an owner photographs a dish (feature 006).
 *
 * The claims that matter are the ones about *not* uploading: a file chosen and
 * then abandoned must leave nothing behind, which is the whole reason the
 * feature needs no cleanup job for the ordinary case.
 */
test.describe("dish photographs", () => {
  const EDIT = /^(upravit|edit|bearbeiten)$/i;
  const SAVE = /^(uložit|save|speichern)$/i;
  const CANCEL = /^(zrušit|cancel|abbrechen)$/i;
  const ADD_PHOTO = /přidat fotku|add photo|foto hinzufügen/i;
  const REPLACE_PHOTO = /nahradit fotku|replace photo|foto ersetzen/i;
  const REMOVE_PHOTO = /odebrat fotku|remove photo|foto entfernen/i;

  /**
   * A section card holds several forms — renaming the section, editing a dish,
   * and the permanently open one for adding the next dish — and the dish forms
   * carry identical controls. Only the one editing an existing dish offers to
   * cancel, which is what picks it out.
   */
  function editForm(card: Locator): Locator {
    return card
      .locator("form")
      .filter({ has: card.page().getByRole("button", { name: CANCEL }) })
      .first();
  }

  /** An owner in the editor with one plain dish, ready to photograph. */
  async function editorWithDish(page: Page) {
    await signUp(page);
    await createMenu(page, "U Modré kachny");
    await addSection(page, "Polévky");
    await addItem(page, "Polévky", { name: "Kulajda", price: "89" });
    return sectionCard(page, "Polévky");
  }

  test("adds a photograph to a dish and shows it in the row (US3 AS1–AS3)", async ({ page }) => {
    const card = await editorWithDish(page);

    await card.getByRole("button", { name: EDIT }).first().click();
    const form = editForm(card);
    // The form says what is accepted before anyone picks wrongly.
    await expect(form.getByRole("button", { name: ADD_PHOTO })).toBeVisible();
    await expect(form.getByText(/10 MB/)).toBeVisible();

    // The fixture is stored sideways with an orientation tag; the framing step
    // and the stored rendition must both come out upright.
    await chooseImage(form, imageFixture("dish-4x3.jpg"));
    await form.getByRole("button", { name: SAVE }).click();

    const thumbnail = card.getByRole("img", { name: "Kulajda" });
    await expect(thumbnail).toBeVisible();

    await page.reload();
    await expect(sectionCard(page, "Polévky").getByRole("img", { name: "Kulajda" })).toBeVisible();
  });

  test("uploads nothing when the dish form is cancelled (US3 AS4)", async ({ page }) => {
    const card = await editorWithDish(page);

    let uploaded = false;
    page.on("request", (request) => {
      if (request.method() === "POST") uploaded = true;
    });

    await card.getByRole("button", { name: EDIT }).first().click();
    const form = editForm(card);
    await chooseImage(form, imageFixture("dish-4x3.jpg"));
    await form.getByRole("button", { name: CANCEL }).click();

    // Nothing was sent, so there is no stored object to clean up — and the dish
    // is exactly as it was.
    expect(uploaded).toBe(false);
    await expect(card.getByRole("img", { name: "Kulajda" })).toHaveCount(0);

    await page.reload();
    await expect(sectionCard(page, "Polévky").getByRole("img", { name: "Kulajda" })).toHaveCount(0);
  });

  test("replaces and then removes a photograph (US3 AS5)", async ({ page }) => {
    const card = await editorWithDish(page);

    await card.getByRole("button", { name: EDIT }).first().click();
    await chooseImage(editForm(card), imageFixture("dish-4x3.jpg"));
    await editForm(card).getByRole("button", { name: SAVE }).click();
    const first = await card.getByRole("img", { name: "Kulajda" }).getAttribute("src");

    await card.getByRole("button", { name: EDIT }).first().click();
    await expect(editForm(card).getByRole("button", { name: REPLACE_PHOTO })).toBeVisible();
    await chooseImage(editForm(card), imageFixture("tiny.webp"));
    await editForm(card).getByRole("button", { name: SAVE }).click();

    // Stored under a new key, so the address changes and no cache can serve the
    // picture the owner just replaced.
    await expect(card.getByRole("img", { name: "Kulajda" })).not.toHaveAttribute(
      "src",
      first ?? "",
    );

    await card.getByRole("button", { name: EDIT }).first().click();
    await editForm(card).getByRole("button", { name: REMOVE_PHOTO }).click();
    await editForm(card).getByRole("button", { name: SAVE }).click();

    await expect(card.getByRole("img", { name: "Kulajda" })).toHaveCount(0);
  });

  test("leaves dishes without photographs entirely alone (US3 AS7)", async ({ page }) => {
    const card = await editorWithDish(page);
    await addItem(page, "Polévky", { name: "Hovězí vývar", price: "79" });

    await card.getByRole("button", { name: EDIT }).first().click();
    await chooseImage(editForm(card), imageFixture("dish-4x3.jpg"));
    await editForm(card).getByRole("button", { name: SAVE }).click();

    await expect(card.getByRole("img", { name: "Kulajda" })).toBeVisible();
    // The other dish shows no image and no placeholder: nothing that would read
    // as something missing.
    await expect(card.getByRole("img", { name: "Hovězí vývar" })).toHaveCount(0);
    await expect(card.getByText("Hovězí vývar")).toBeVisible();
  });

  test("refuses a file that is not an image, without a request (US3 AS8)", async ({ page }) => {
    const card = await editorWithDish(page);

    let uploaded = false;
    page.on("request", (request) => {
      if (request.method() === "POST") uploaded = true;
    });

    await card.getByRole("button", { name: EDIT }).first().click();
    const form = editForm(card);
    await form.locator('input[type="file"]').first().setInputFiles(imageFixture("not-an-image.png"));

    await expect(
      form.getByText(/JPEG, PNG nebo WebP|JPEG, PNG or WebP|JPEG-, PNG- oder WebP/i),
    ).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(uploaded).toBe(false);

    // The rest of the dish is still editable and saveable — one bad file does
    // not cost the owner their other edits.
    await form.getByRole("textbox", { name: /název jídla|dish name/i }).fill("Kulajda speciál");
    await form.getByRole("button", { name: SAVE }).click();
    await expect(card.getByText("Kulajda speciál")).toBeVisible();
  });

  /**
   * That the stored object is *removed* is asserted in the API suite, against
   * the storage port itself, where it is a direct observation rather than a
   * race against a best-effort delete. What belongs here is the owner's side of
   * the same act: the dish and its picture leave the editor together.
   */
  test("deleting a photographed dish takes its picture out of the editor (US3 AS6)", async ({
    page,
  }) => {
    const card = await editorWithDish(page);

    await card.getByRole("button", { name: EDIT }).first().click();
    await chooseImage(editForm(card), imageFixture("dish-4x3.jpg"));
    await editForm(card).getByRole("button", { name: SAVE }).click();
    await expect(card.getByRole("img", { name: "Kulajda" })).toBeVisible();

    await card.getByRole("button", { name: /smazat jídlo|delete dish/i }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /^(smazat|delete|löschen)$/i })
      .click();

    // Deleting is a plain form post followed by a revalidation, so what is
    // waited on is a server round trip rather than a repaint.
    await expect(card.getByText("Kulajda")).toHaveCount(0, { timeout: 15_000 });
    await expect(card.getByRole("img", { name: "Kulajda" })).toHaveCount(0);

    await page.reload();
    await expect(sectionCard(page, "Polévky").getByRole("img", { name: "Kulajda" })).toHaveCount(0);
  });
});

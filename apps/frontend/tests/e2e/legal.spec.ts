import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import cs from "../../messages/cs.json";
import de from "../../messages/de.json";
import en from "../../messages/en.json";

/**
 * The legal pages and the cookie notice, on a production build.
 *
 * These are the pages nobody looks at until something has gone wrong, which is
 * exactly why they are worth testing: a privacy policy that 404s in German, or
 * a notice that reappears after every click, is only ever discovered by the
 * person you least want discovering it.
 */

const MESSAGES = { cs, en, de } as const;
type Locale = keyof typeof MESSAGES;
const LOCALES = ["cs", "en", "de"] as const;
const DOCUMENTS = ["privacy", "terms", "cookies"] as const;

/** Keep the hero clip out of it; these tests have nothing to do with video. */
test.beforeEach(async ({ page }) => {
  await page.route(/\.(mp4|webm)(\?|$)/, (route) => route.abort());
});

async function expectNoAxeViolations(page: Page, context: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  const summary = results.violations
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s) — ${v.help}`)
    .join("\n  ");

  expect(results.violations, `${context}\n  ${summary}`).toEqual([]);
}

test.describe("legal documents", () => {
  for (const locale of LOCALES) {
    for (const document of DOCUMENTS) {
      test(`${locale}/${document} is published and translated`, async ({
        page,
      }) => {
        const response = await page.goto(`/${locale}/${document}`);
        expect(response?.status()).toBe(200);

        await expect(page.locator("html")).toHaveAttribute("lang", locale);
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(
          MESSAGES[locale as Locale].Legal[document].title,
        );

        // Every section rendered, none left as a raw key.
        const sections = page.locator("section[aria-labelledby]");
        expect(await sections.count()).toBeGreaterThanOrEqual(5);

        const body = await page.locator("body").innerText();
        expect(body, `${locale}: an untranslated key is on the page`).not.toMatch(
          /Legal\.[a-z]/i,
        );
      });
    }
  }

  test("names a controller, or says it is a draft", async ({ page }) => {
    // One or the other must be true. A policy that silently names nobody is
    // the failure this guards against.
    await page.goto("/cs/privacy");
    const note = page.getByRole("note");
    const hasDraftNotice = (await note.count()) > 0;

    if (hasDraftNotice) {
      await expect(note).toContainText(cs.Legal.draftNotice.title);
    } else {
      await expect(page.locator("main")).not.toContainText("—,");
    }
  });

  test("lists every stored key in the cookie policy", async ({ page }) => {
    await page.goto("/cs/cookies");
    const table = page.getByRole("table");
    await expect(table).toBeVisible();

    for (const name of ["NEXT_LOCALE", "restaura-appearance", "restaura-consent"]) {
      await expect(table, `${name} must be disclosed`).toContainText(name);
    }
  });

  test("keeps legal pages out of search results", async ({ page }) => {
    // They exist for people who came looking, not to compete with the pages
    // that are meant to be found.
    await page.goto("/cs/terms");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
  });

  test("is reachable from the landing page footer", async ({ page }) => {
    await page.goto("/cs");
    for (const document of DOCUMENTS) {
      await expect(
        page.locator(`footer a[href="/cs/${document}"]`),
        `the footer must link to ${document}`,
      ).toHaveCount(1);
    }
  });

  test("has no accessibility violations in either appearance", async ({
    page,
  }) => {
    for (const colorScheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme });
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto("/de/cookies");
      await expectNoAxeViolations(page, `de/cookies / ${colorScheme}`);
    }
  });

  test("does not scroll sideways at 320px", async ({ page }) => {
    // The cookie table is the one wide thing on the site; it must scroll
    // inside its own box rather than dragging the page with it.
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto("/de/cookies");

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
  });
});

test.describe("cookie notice", () => {
  test("appears, links to the policy, and stays dismissed", async ({ page }) => {
    await page.goto("/cs");

    const notice = page.getByRole("region", { name: cs.Legal.banner.label });
    await expect(notice).toBeVisible();
    await expect(notice.getByRole("link")).toHaveAttribute("href", "/cs/cookies");

    await notice.getByRole("button").first().click();
    await expect(notice).toHaveCount(0);

    // A decision survives navigation — otherwise it is not a decision.
    await page.goto("/cs/terms");
    await expect(
      page.getByRole("region", { name: cs.Legal.banner.label }),
    ).toHaveCount(0);
  });

  test("stores no consent cookie until the visitor answers", async ({ page }) => {
    // Nothing may be written before an affirmative act (GDPR Art. 4(11)).
    await page.goto("/cs");
    const before = await page.context().cookies();
    expect(
      before.map((c) => c.name),
      "a consent cookie was written before anyone consented",
    ).not.toContain("restaura-consent");

    await page
      .getByRole("region", { name: cs.Legal.banner.label })
      .getByRole("button")
      .first()
      .click();

    await expect
      .poll(async () =>
        (await page.context().cookies()).map((c) => c.name),
      )
      .toContain("restaura-consent");
  });

  test("can be withdrawn from the cookie policy", async ({ page }) => {
    // Withdrawal must be as easy as granting (GDPR Art. 7(3)) — one click,
    // on a page the notice itself links to.
    await page.goto("/cs");
    await page
      .getByRole("region", { name: cs.Legal.banner.label })
      .getByRole("button")
      .first()
      .click();

    await page.goto("/cs/cookies");
    const reset = page.getByRole("button", { name: cs.Legal.cookies.reset });
    await expect(reset).toBeEnabled();
    await reset.click();

    await expect(page.getByRole("status")).toContainText(
      cs.Legal.cookies.resetDone,
    );

    // And the notice asks again.
    await page.goto("/cs");
    await expect(
      page.getByRole("region", { name: cs.Legal.banner.label }),
    ).toBeVisible();
  });

  test("never covers the page's own call to action", async ({ page }) => {
    // A notice that sits on top of the primary button is a notice that costs
    // conversions and annoys people into clicking anything to be rid of it.
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/cs");

    const cta = page
      .locator('[data-slot="hero"]')
      .getByRole("link", { name: cs.Landing.hero.cta });
    const notice = page.getByRole("region", { name: cs.Legal.banner.label });

    const ctaBox = await cta.boundingBox();
    const noticeBox = await notice.boundingBox();
    expect(ctaBox).not.toBeNull();
    expect(noticeBox).not.toBeNull();

    const overlaps =
      ctaBox!.y < noticeBox!.y + noticeBox!.height &&
      ctaBox!.y + ctaBox!.height > noticeBox!.y;
    expect(overlaps, "the cookie notice overlaps the hero call to action").toBe(
      false,
    );
  });
});

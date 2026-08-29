import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import cs from "../../messages/cs.json";
import de from "../../messages/de.json";
import en from "../../messages/en.json";

/**
 * The landing page, measured on a real production build.
 *
 * Storybook proves the pieces. This is the only place the claims that depend on
 * the whole page can be checked: that the offer is visible without scrolling on
 * a phone, that it survives its own photographs failing to load, that the
 * pricing table says what the spec promised, and that none of it falls apart in
 * German or in the dark.
 */

const MESSAGES = { cs, en, de } as const;
type Locale = keyof typeof MESSAGES;

/** Czech is the default; German is ~30% longer and is where text overflows. */
const LOCALES = ["cs", "de"] as const;

const VIEWPORTS = [
  { name: "320", width: 320, height: 720 },
  { name: "375", width: 375, height: 812 },
  { name: "768", width: 768, height: 1024 },
  { name: "1024", width: 1024, height: 768 },
  { name: "1920", width: 1920, height: 1080 },
  // A short laptop window: the case where a full-viewport hero pushes its own
  // call to action off the bottom of the screen.
  { name: "1366x600", width: 1366, height: 600 },
] as const;

const path = (locale: string) => `/${locale}`;

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => {
    const el = document.documentElement;
    return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth };
  });
  // A one-pixel rounding difference is not a layout bug; anything more is.
  expect(
    overflow.scrollWidth,
    `Page scrolls horizontally: ${overflow.scrollWidth}px content in ${overflow.clientWidth}px viewport`,
  ).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

/**
 * Walks the page so every reveal has fired, then waits for the transitions to
 * finish.
 *
 * Without this, an audit can run while content below the fold is still at
 * `opacity: 0` — and axe, quite correctly, reports transparent text as failing
 * contrast. That is a true statement about a transient state and a false one
 * about the page, and whether it happens depends on how loaded the machine is,
 * which is the definition of a flaky test. Settling first audits the page a
 * reader actually ends up looking at.
 */
async function settleReveals(page: Page) {
  await page.evaluate(async () => {
    const step = Math.max(window.innerHeight, 1);
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    window.scrollTo(0, 0);
  });

  await expect(page.locator('[data-reveal="hidden"]')).toHaveCount(0);
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => a.playState !== "running"),
  );
}

async function expectNoAxeViolations(page: Page, context: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  const summary = results.violations
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s) — ${v.help}`)
    .join("\n  ");

  expect(results.violations, `${context}\n  ${summary}`).toEqual([]);
}

test.describe("@us1 the offer", () => {
  for (const locale of LOCALES) {
    for (const viewport of VIEWPORTS) {
      for (const colorScheme of ["light", "dark"] as const) {
        test(`${locale} @ ${viewport.name} ${colorScheme} states the offer without scrolling`, async ({
          page,
        }) => {
          await page.emulateMedia({ colorScheme });
          await page.setViewportSize({
            width: viewport.width,
            height: viewport.height,
          });
          await page.goto(path(locale));

          // The headline and the primary action are the whole point of the
          // first screen: both must be reachable without a scroll gesture.
          const heading = page.getByRole("heading", { level: 1 });
          await expect(heading).toBeInViewport();

          // Scoped to the hero on purpose: the header carries the same words,
          // and a test that accepts either is not testing the first screen.
          const cta = page
            .locator('[data-slot="hero"]')
            .getByRole("link", {
              name: MESSAGES[locale as Locale].Landing.hero.cta,
            });
          await expect(cta).toBeInViewport();

          await expectNoHorizontalScroll(page);
        });
      }
    }
  }

  test("says what it does in three sections, in order", async ({ page }) => {
    await page.goto(path("cs"));
    const capabilities = page.locator("[data-capability]");
    await expect(capabilities).toHaveCount(3);
    await expect(capabilities.nth(0)).toHaveAttribute(
      "data-capability",
      "digitalMenu",
    );
    await expect(capabilities.nth(1)).toHaveAttribute("data-capability", "pdf");
    await expect(capabilities.nth(2)).toHaveAttribute("data-capability", "qr");
  });

  test("reads even when none of its media loads", async ({ page }) => {
    // Spec FR-003. The scrim under the hero is painted unconditionally, so the
    // offer never depends on a photograph having arrived.
    await page.route("**/landing/**", (route) => route.abort());
    await page.route("**/_next/image**", (route) => route.abort());

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(path("cs"));

    await expect(page.getByRole("heading", { level: 1 })).toBeInViewport();
    await expect(
      page
        .locator('[data-slot="hero"]')
        .getByRole("link", { name: cs.Landing.hero.cta }),
    ).toBeInViewport();
  });

  test("every call to action leads somewhere real", async ({ page }) => {
    await page.goto(path("cs"));

    const hrefs = await page
      .locator('[data-slot="cta"]')
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("href")));

    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      expect(href, "a call to action must have a destination").toBeTruthy();
      expect(href).not.toBe("#");
    }
  });

  test("keeps the German headline clear of its own button", async ({ page }) => {
    // German is the longest of the three; if a headline is going to collide
    // with the call to action underneath it, it happens here.
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(path("de"));

    const heading = await page
      .getByRole("heading", { level: 1 })
      .boundingBox();
    const cta = await page
      .locator('[data-slot="hero"]')
      .getByRole("link", { name: de.Landing.hero.cta })
      .boundingBox();

    expect(heading).not.toBeNull();
    expect(cta).not.toBeNull();
    expect(
      heading!.y + heading!.height,
      "the headline overlaps the call to action",
    ).toBeLessThanOrEqual(cta!.y);
  });
});

test.describe("@us2 pricing", () => {
  test("shows three tiers, free first", async ({ page }) => {
    await page.goto(path("cs"));

    const plans = page.locator("[data-plan]");
    await expect(plans).toHaveCount(3);
    await expect(plans.nth(0)).toHaveAttribute("data-plan", "free");
    await expect(plans.nth(1)).toHaveAttribute("data-plan", "pro");
    await expect(plans.nth(2)).toHaveAttribute("data-plan", "proPlus");
  });

  test("prices Pro at 129 CZK and marks both roadmap tiers in words", async ({
    page,
  }) => {
    await page.goto(path("cs"));

    await expect(page.locator('[data-plan="pro"]')).toContainText("129");

    // "Coming soon" must be text, not a colour (spec FR-016).
    for (const id of ["pro", "proPlus"]) {
      await expect(
        page.locator(`[data-plan="${id}"]`),
        `${id} must say it is not available yet`,
      ).toContainText(cs.Landing.pricing.comingSoon);
      await expect(page.locator(`[data-plan="${id}"]`)).toHaveAttribute(
        "data-availability",
        "comingSoon",
      );
    }

    // Exactly one tier can actually be started today.
    await expect(page.locator('[data-availability="available"]')).toHaveCount(1);
  });

  test("never offers to sell a tier that has not launched", async ({ page }) => {
    await page.goto(path("cs"));

    for (const id of ["pro", "proPlus"]) {
      const href = await page
        .locator(`[data-plan="${id}"] [data-slot="cta"]`)
        .getAttribute("href");
      expect(href).toBeTruthy();
      expect(href, `${id} must capture interest, not payment`).not.toMatch(
        /checkout|payment|\bpay\b/i,
      );
    }
  });

  test("stacks the tiers with free on top on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(path("cs"));

    const boxes = await page
      .locator("[data-plan]")
      .evaluateAll((nodes) =>
        nodes.map((n) => {
          const rect = n.getBoundingClientRect();
          return { id: n.getAttribute("data-plan"), top: rect.top };
        }),
      );

    expect(boxes.map((b) => b.id)).toEqual(["free", "pro", "proPlus"]);
    expect(boxes[0].top).toBeLessThan(boxes[1].top);
    expect(boxes[1].top).toBeLessThan(boxes[2].top);
  });
});

test.describe("@us3 language, appearance and motion", () => {
  test("renders entirely in each supported language", async ({ page }) => {
    for (const locale of ["cs", "en", "de"] as const) {
      await page.goto(path(locale));
      await expect(page.locator("html")).toHaveAttribute("lang", locale);

      // The page's own words, in that language.
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        MESSAGES[locale].Landing.hero.headline,
      );

      // No raw message key ever reaches the screen.
      const body = (await page.locator("body").innerText()).toLowerCase();
      expect(body, `${locale}: an untranslated key is on the page`).not.toMatch(
        /landing\.[a-z]/,
      );
    }
  });

  test("has no accessibility violations in either appearance", async ({
    page,
  }) => {
    for (const colorScheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme });
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(path("de"));
      await settleReveals(page);
      await expectNoAxeViolations(page, `de / ${colorScheme}`);
    }
  });

  test("plays nothing and downloads no video under reduced motion", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 375, height: 812 });

    const videoRequests: string[] = [];
    page.on("request", (request) => {
      if (/\.(mp4|webm)(\?|$)/.test(request.url())) {
        videoRequests.push(request.url());
      }
    });

    await page.goto(path("cs"));
    await page.waitForLoadState("networkidle");

    // The clip is opt-in: no element, so nothing to download.
    await expect(page.locator("video")).toHaveCount(0);
    expect(videoRequests, "a clip was fetched despite reduced motion").toEqual(
      [],
    );

    const running = await page.evaluate(
      () => document.getAnimations().filter((a) => a.playState === "running").length,
    );
    expect(running, "no animation should run under prefers-reduced-motion").toBe(
      0,
    );

    // And with the reveal disabled, the content is still there.
    await expect(page.locator("[data-capability]")).toHaveCount(3);
  });

  test("shows every section when JavaScript never runs", async ({ browser }) => {
    // The reveal is an enhancement. Without it the page must still be a page.
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    await page.goto(path("cs"));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("[data-capability]")).toHaveCount(3);
    await expect(page.locator("[data-plan]")).toHaveCount(3);

    // Nothing may be sitting at opacity 0 waiting for an observer.
    const invisible = await page
      .locator('[data-slot="reveal"]')
      .evaluateAll((nodes) =>
        nodes.filter((n) => Number(getComputedStyle(n).opacity) < 1).length,
      );
    expect(invisible, "content is hidden without JavaScript").toBe(0);

    await context.close();
  });
});

test.describe("@us1 scope", () => {
  test("mentions nothing the product cannot do yet", async ({ page }) => {
    // Ordering is documented in the design system but not shipped (spec
    // FR-019). If an ordering affordance ever reaches this page, it fails here.
    for (const locale of ["cs", "en", "de"] as const) {
      await page.goto(path(locale));
      expect(
        await page.locator("[data-ordering]").count(),
        `${locale}: ordering components must not render on the landing page`,
      ).toBe(0);
    }
  });
});

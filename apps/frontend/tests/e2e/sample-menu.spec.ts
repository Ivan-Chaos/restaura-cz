import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * The guest experience, measured on a real production build.
 *
 * Storybook proves components in isolation. This is the only place the claims
 * that depend on the *whole page* can be checked: static rendering, real fonts,
 * real locale routing, real viewport behaviour.
 *
 * The matrix is deliberate. Czech is the default locale; German is ~30% longer
 * and is where text overflow shows up. 320px is the narrowest supported width;
 * 1920px is where a layout can go slack. Warm and slate are opposites, so a
 * hard-coded colour cannot survive both.
 */

const LOCALES = ["cs", "de"] as const;

const VIEWPORTS = [
  { name: "320", width: 320, height: 720 },
  { name: "375", width: 375, height: 812 },
  { name: "768", width: 768, height: 1024 },
  { name: "1024", width: 1024, height: 768 },
  { name: "1920", width: 1920, height: 1080 },
] as const;

/** Theme is a static route segment, so every variant is prerendered. */
const path = (locale: string, theme?: string) =>
  theme ? `/${locale}/sample-menu/${theme}` : `/${locale}/sample-menu`;

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

async function expectNoAxeViolations(page: Page, context: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  const summary = results.violations
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s) — ${v.help}`)
    .join("\n  ");

  expect(results.violations, `${context}\n  ${summary}`).toEqual([]);
}

test.describe("@us1 guest menu", () => {
  for (const locale of LOCALES) {
    for (const viewport of VIEWPORTS) {
      for (const colorScheme of ["light", "dark"] as const) {
        test(`${locale} @ ${viewport.name}px ${colorScheme} reads correctly`, async ({
          page,
        }) => {
          await page.emulateMedia({ colorScheme });
          await page.setViewportSize({ width: viewport.width, height: viewport.height });
          await page.goto(path(locale));

          // The establishment name is the page's one h1.
          await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

          await expectNoHorizontalScroll(page);

          // Every category must be reachable as a labelled region, which is how
          // a screen-reader user navigates a long menu.
          const sections = page.locator("section[aria-labelledby]");
          expect(await sections.count()).toBeGreaterThanOrEqual(4);
        });
      }
    }
  }

  test("shows a dish, its price, and says when something is unavailable", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto(path("cs"));

    // A guest looking for a specific dish must find it and its price.
    await expect(page.getByText("Svíčková na smetaně").first()).toBeVisible();
    await expect(page.getByText(/285/).first()).toBeVisible();

    // Sold out must be words, not only a colour or an opacity (spec FR-016).
    await expect(page.getByText("Vyprodáno").first()).toBeVisible();

    // "From" and market prices must render as their own thing.
    await expect(page.getByText(/od\s/).first()).toBeVisible();
    await expect(page.getByText("Denní cena").first()).toBeVisible();
  });

  test("has no accessibility violations in either appearance", async ({ page }) => {
    for (const colorScheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme });
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(path("cs"));
      await expectNoAxeViolations(page, `cs / ${colorScheme}`);
    }
  });

  test("renders the menu in every supported language", async ({ page }) => {
    for (const locale of ["cs", "en", "de"] as const) {
      await page.goto(path(locale));
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
  });
});

test.describe("@us2 theming", () => {
  test("a scoped theme repaints the page with no component change", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    await page.goto(path("cs", "warm"));
    const warm = await page.evaluate(() => {
      const scope = document.querySelector("[data-theme]") ?? document.documentElement;
      const styles = getComputedStyle(scope);
      return {
        primary: styles.getPropertyValue("--primary").trim(),
        radius: styles.getPropertyValue("--radius").trim(),
        density: styles.getPropertyValue("--density").trim(),
      };
    });

    await page.goto(path("cs", "slate"));
    const slate = await page.evaluate(() => {
      const scope = document.querySelector("[data-theme]") ?? document.documentElement;
      const styles = getComputedStyle(scope);
      return {
        primary: styles.getPropertyValue("--primary").trim(),
        radius: styles.getPropertyValue("--radius").trim(),
        density: styles.getPropertyValue("--density").trim(),
      };
    });

    expect(warm.primary).not.toBe("");
    expect(slate.primary).not.toBe(warm.primary);
    expect(slate.radius).not.toBe(warm.radius);
    expect(slate.density).not.toBe(warm.density);
  });

  for (const theme of ["warm", "slate"] as const) {
    for (const colorScheme of ["light", "dark"] as const) {
      test(`${theme} / ${colorScheme} stays accessible and fits 320px`, async ({
        page,
      }) => {
        await page.emulateMedia({ colorScheme });
        await page.setViewportSize({ width: 320, height: 720 });
        await page.goto(path("de", theme));

        await expectNoHorizontalScroll(page);
        await expectNoAxeViolations(page, `${theme} / ${colorScheme} / de @320`);
      });
    }
  }
});

test.describe("@us5 ordering boundary", () => {
  test("the guest menu exposes no ordering affordance", async ({ page }) => {
    // Ordering components are documented but not shipped (spec SC-012). If one
    // ever leaks into a route, this fails before a guest can press it.
    for (const locale of LOCALES) {
      await page.goto(path(locale));
      expect(
        await page.locator("[data-ordering]").count(),
        `${locale}: ordering components must not render on the guest menu`,
      ).toBe(0);
    }
  });
});

test.describe("preferences", () => {
  test("honours reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(path("cs"));

    // Nothing may be mid-animation once the page has settled.
    await page.waitForLoadState("networkidle");
    const running = await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter((a) => a.playState === "running").length,
    );
    expect(running, "no animation should run under prefers-reduced-motion").toBe(0);
  });

  test("survives a 200% font size at 320px", async ({ page }) => {
    // A guest with low vision scales text; the menu must still be usable rather
    // than spilling sideways.
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto(path("cs"));
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });

    await expectNoHorizontalScroll(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});

test.describe("static rendering", () => {
  test("serves the menu without client-side data fetching", async ({ page }) => {
    // The page must be prerendered (constitution, Principle IV). A menu that
    // fetches on the client is a menu that is blank on a bad connection.
    const dataRequests: string[] = [];
    page.on("request", (request) => {
      if (request.resourceType() === "fetch" || request.resourceType() === "xhr") {
        dataRequests.push(request.url());
      }
    });

    await page.goto(path("cs"));
    await page.waitForLoadState("networkidle");

    expect(dataRequests, `unexpected client data fetches: ${dataRequests.join(", ")}`).toEqual(
      [],
    );
  });
});

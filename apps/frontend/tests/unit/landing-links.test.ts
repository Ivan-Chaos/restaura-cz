import { afterEach, describe, expect, it } from "vitest";

import { THEME_IDS } from "@/lib/design-system/themes";
import { CAPABILITIES, STYLE_DEMOS } from "@/lib/landing/capabilities";
import {
  isInternalHref,
  LANDING_CONTACT_EMAIL,
  resolveNotifyHref,
  resolveSignupHref,
} from "@/lib/landing/links";
import { VISUAL_VARIANT_IDS } from "@/lib/menu-display/variants";

/**
 * The style gallery links (feature 005 US4). Every owner-selectable style has a
 * prerendered sample, and nothing else is advertised.
 */
describe("style demos", () => {
  it("lists exactly the owner-selectable styles, in catalogue order", () => {
    expect(STYLE_DEMOS.map((d) => d.id)).toEqual([...VISUAL_VARIANT_IDS]);
    expect(STYLE_DEMOS.some((d) => d.href.includes("slate"))).toBe(false);
  });

  it("points every style at a prerendered sample-menu path", () => {
    for (const demo of STYLE_DEMOS) {
      expect(isInternalHref(demo.href), demo.href).toBe(true);
      if (demo.href === "/sample-menu") continue;
      const theme = demo.href.replace("/sample-menu/", "");
      expect(THEME_IDS, `${demo.id} → ${demo.href}`).toContain(theme);
    }
  });

  it("hangs the gallery off the digital-menu capability only", () => {
    const withDemos = CAPABILITIES.filter((c) => c.styleDemos);
    expect(withDemos.map((c) => c.id)).toEqual(["digitalMenu"]);
  });
});

/**
 * The one rule these links must never break: a call to action always leads
 * somewhere a human can act on. Not `#`, not an empty string, not a checkout
 * for a product that has not launched.
 */

const SIGNUP_SUBJECT = "I would like to start with Restaura";
const NOTIFY_SUBJECT = "Notify me when Pro launches";

afterEach(() => {
  delete process.env.NEXT_PUBLIC_SIGNUP_URL;
  delete process.env.NEXT_PUBLIC_NOTIFY_URL;
});

describe("resolveSignupHref", () => {
  it("falls back to a real mailbox when no sign-up exists yet", () => {
    const href = resolveSignupHref("cs", SIGNUP_SUBJECT);
    expect(href.startsWith(`mailto:${LANDING_CONTACT_EMAIL}`)).toBe(true);
    expect(href).toContain(encodeURIComponent(SIGNUP_SUBJECT));
  });

  it("uses the configured destination once one is set", () => {
    process.env.NEXT_PUBLIC_SIGNUP_URL = "https://forms.example/start";
    expect(resolveSignupHref("de", SIGNUP_SUBJECT)).toBe(
      "https://forms.example/start",
    );
  });

  it("substitutes the locale into a template", () => {
    process.env.NEXT_PUBLIC_SIGNUP_URL = "https://app.example/{locale}/signup";
    expect(resolveSignupHref("de", SIGNUP_SUBJECT)).toBe(
      "https://app.example/de/signup",
    );
  });

  it("never resolves to an empty target", () => {
    for (const locale of ["cs", "en", "de"]) {
      expect(resolveSignupHref(locale, SIGNUP_SUBJECT).length).toBeGreaterThan(
        1,
      );
      expect(resolveSignupHref(locale, SIGNUP_SUBJECT)).not.toBe("#");
    }
  });
});

describe("resolveNotifyHref", () => {
  it("captures interest by email when nothing is configured", () => {
    const href = resolveNotifyHref("cs", "pro", NOTIFY_SUBJECT);
    expect(href.startsWith("mailto:")).toBe(true);
    expect(href).toContain(encodeURIComponent(NOTIFY_SUBJECT));
  });

  it("substitutes both locale and plan into a template", () => {
    process.env.NEXT_PUBLIC_NOTIFY_URL =
      "https://forms.example/{locale}/waitlist?plan={plan}";
    expect(resolveNotifyHref("en", "proPlus", NOTIFY_SUBJECT)).toBe(
      "https://forms.example/en/waitlist?plan=proPlus",
    );
  });

  it("leaves unknown placeholders alone rather than emptying them", () => {
    process.env.NEXT_PUBLIC_NOTIFY_URL = "https://forms.example/{unknown}";
    expect(resolveNotifyHref("en", "pro", NOTIFY_SUBJECT)).toBe(
      "https://forms.example/{unknown}",
    );
  });

  it("never points a coming-soon plan at a payment flow", () => {
    const href = resolveNotifyHref("cs", "pro", NOTIFY_SUBJECT);
    expect(href).not.toMatch(/checkout|payment|\bpay\b/i);
  });
});

describe("isInternalHref", () => {
  it("recognises app routes", () => {
    expect(isInternalHref("/sample-menu")).toBe(true);
  });

  it("rejects external and mailto targets", () => {
    expect(isInternalHref("https://example.com")).toBe(false);
    expect(isInternalHref("mailto:hello@restaura.cz")).toBe(false);
  });

  it("rejects protocol-relative URLs that only look internal", () => {
    // `//evil.example` would otherwise be handed to the localised <Link>.
    expect(isInternalHref("//evil.example")).toBe(false);
  });
});

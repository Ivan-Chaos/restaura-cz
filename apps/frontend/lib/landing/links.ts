import type { PlanId } from "./plans";

/**
 * Where the landing page's calls to action go.
 *
 * Every CTA resolves through here so that a destination is configuration rather
 * than markup, and so that no button can end up a dead `#`.
 *
 * "Start for free" now goes to the real sign-up route: registration, email
 * confirmation and the workspace all exist, so sending someone who pressed
 * "Get started" to a mail client instead was asking them to write a letter
 * about a form that is one click away. The `mailto:` fallback remains for
 * "notify me", because the paid tiers genuinely have nothing to sign up to yet.
 *
 * `NEXT_PUBLIC_*` values are inlined at build time and are public by
 * definition — these are destinations, not secrets.
 */

/** For the footer's own contact link, and for the plans that have not launched. */
export const LANDING_CONTACT_EMAIL = "hello@restaura.cz";

/**
 * The app's own sign-up. Locale-less on purpose: `CtaButton` hands an internal
 * href to the localised `Link`, which adds the prefix. Writing `/cs/sign-up`
 * here would produce `/cs/cs/sign-up`.
 */
export const SIGNUP_PATH = "/sign-up";

function mailto(subject: string): string {
  return `mailto:${LANDING_CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}

/**
 * Substitutes `{locale}` / `{plan}` in a configured URL template. Templates are
 * how one env var serves three locales and two coming-soon plans.
 */
function fillTemplate(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? values[key] : match,
  );
}

/**
 * "Start for free" — the app's own sign-up, unless a deployment points its
 * marketing elsewhere (an external form, a different app) with
 * `NEXT_PUBLIC_SIGNUP_URL`.
 */
export function resolveSignupHref(locale: string): string {
  const configured = process.env.NEXT_PUBLIC_SIGNUP_URL;
  if (configured) return fillTemplate(configured, { locale });
  return SIGNUP_PATH;
}

/** "Notify me" on a coming-soon plan. Never a checkout, by construction. */
export function resolveNotifyHref(
  locale: string,
  plan: PlanId,
  subject: string,
): string {
  const configured = process.env.NEXT_PUBLIC_NOTIFY_URL;
  if (configured) return fillTemplate(configured, { locale, plan });
  return mailto(subject);
}

/**
 * Whether a resolved href is an app route, and so must go through the
 * localised `Link` from `@/i18n/navigation` rather than a bare anchor.
 * `//evil.example` is not internal, despite the leading slash.
 */
export function isInternalHref(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//");
}

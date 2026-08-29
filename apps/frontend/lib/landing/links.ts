import type { PlanId } from "./plans";

/**
 * Where the landing page's calls to action go.
 *
 * There is no sign-up backend yet, and a marketing page whose only button is a
 * dead `#` is worse than no button. So every CTA resolves through here: an
 * environment variable when the owner has somewhere to send people (a form, and
 * later the real sign-up route), and a `mailto:` with a translated subject line
 * when they do not. Both are real destinations, and swapping one for the other
 * never touches a component.
 *
 * `NEXT_PUBLIC_*` values are inlined at build time and are public by
 * definition — these are destinations, not secrets.
 */

/** Fallback destination. Reachable today, unlike a sign-up flow that does not exist. */
export const LANDING_CONTACT_EMAIL = "hello@restaura.cz";

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
 * "Start for free". `subject` is the already-translated fallback mail subject —
 * resolving it is the caller's job, because only the component has the locale's
 * messages in hand.
 */
export function resolveSignupHref(locale: string, subject: string): string {
  const configured = process.env.NEXT_PUBLIC_SIGNUP_URL;
  if (configured) return fillTemplate(configured, { locale });
  return mailto(subject);
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

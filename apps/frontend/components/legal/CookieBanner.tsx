"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { useCookieConsent } from "@/hooks/use-cookie-consent";
import { Link } from "@/i18n/navigation";
import { REQUIRES_CONSENT } from "@/lib/legal/cookies";

/**
 * The cookie notice.
 *
 * It has two modes, and which one it is in is derived from the storage
 * inventory rather than chosen by hand:
 *
 *   **Notice** (today) — nothing on this site is stored that a visitor could
 *   meaningfully refuse: a language choice, an appearance preference, and the
 *   record of this very decision. Under ePrivacy Art. 5(3) none of that needs
 *   prior consent, so asking for it would be theatre — and worse, it would
 *   train people to click through a question that did not matter. The banner
 *   states what is stored and offers one honest dismissal.
 *
 *   **Consent** — the moment a non-necessary entry is added to
 *   `STORAGE_INVENTORY`, `REQUIRES_CONSENT` flips and this becomes a real
 *   choice: accept and reject, side by side, equally prominent, neither
 *   preselected. Anything gated on `allows("analytics")` stays off until
 *   someone actively says yes.
 *
 * Deliberately not modal. A cookie notice that traps focus holds the page
 * hostage over a question about a language preference; this one sits at the
 * bottom, is reachable in the tab order, and never steals focus on load.
 */
export function CookieBanner() {
  const t = useTranslations("Legal.banner");
  const { decided, decide } = useCookieConsent();

  // Nothing renders server-side (the hook's server snapshot is "no decision"
  // and `decided` is false), so the banner appears after hydration, below the
  // fold's content, and cannot shift the page or delay first paint.
  if (decided) return null;

  return (
    <div
      role="region"
      aria-label={t("label")}
      className="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6"
    >
      <div className="bg-card text-card-foreground shadow-overlay ring-border mx-auto flex max-w-3xl flex-col gap-4 rounded-xl p-5 ring-1 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex flex-col gap-1">
          <p className="font-medium">{t("title")}</p>
          <p className="text-muted-foreground text-sm leading-relaxed text-pretty">
            {REQUIRES_CONSENT ? t("consentBody") : t("noticeBody")}
          </p>
          <Link
            href="/cookies"
            // This banner is on every page, including the guest menu — the one
            // route that has to be fast on a bad connection at a table.
            // Prefetching a policy almost nobody opens would put three RSC
            // requests on every one of those loads to save a click that rarely
            // happens.
            prefetch={false}
            className="text-primary mt-1 w-fit rounded-sm text-sm underline-offset-4 hover:underline"
          >
            {t("more")}
          </Link>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col">
          {REQUIRES_CONSENT ? (
            <>
              {/*
                Reject is listed first and styled identically. Making refusal
                harder than acceptance is the dark pattern regulators actually
                fine people for.
              */}
              <Button size="lg" variant="outline" onClick={() => decide([])}>
                {t("reject")}
              </Button>
              <Button size="lg" onClick={() => decide(["analytics"])}>
                {t("accept")}
              </Button>
            </>
          ) : (
            <Button size="lg" onClick={() => decide([])}>
              {t("acknowledge")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

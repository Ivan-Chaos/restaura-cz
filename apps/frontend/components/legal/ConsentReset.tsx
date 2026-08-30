"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { useCookieConsent } from "@/hooks/use-cookie-consent";

/**
 * Withdrawing the cookie decision, from the cookie policy itself.
 *
 * GDPR Art. 7(3) requires that withdrawing consent be as easy as giving it.
 * Giving it took one click on a banner, so taking it back takes one click on a
 * button — not an email, not a form, and not a settings panel three levels
 * down. Clearing the record makes the notice ask again.
 */
export function ConsentReset() {
  const t = useTranslations("Legal.cookies");
  const { decided, reset } = useCookieConsent();
  const [cleared, setCleared] = useState(false);

  return (
    <div className="border-border flex flex-col items-start gap-3 rounded-lg border p-5">
      <Button
        type="button"
        variant="outline"
        size="lg"
        disabled={!decided}
        onClick={() => {
          reset();
          setCleared(true);
        }}
      >
        {t("reset")}
      </Button>

      {/* Announced, not just shown: the button vanishing is not feedback. */}
      <p role="status" aria-live="polite" className="text-muted-foreground text-sm">
        {cleared ? t("resetDone") : null}
      </p>
    </div>
  );
}

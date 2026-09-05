import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

export interface PoweredByProps {
  className?: string;
}

/**
 * The Restaura line on a printed document.
 *
 * Present by default and removable only on a paid plan — which is why nothing
 * about that decision is made here. The component renders the line; whether it
 * is rendered at all is decided by `resolveBranding` from the account's plan,
 * server-side, so a hand-edited URL cannot drop it (spec 007 FR-014, FR-017).
 *
 * Quiet on purpose: a restaurant's menu is theirs, and a mark that competed
 * with the food would be the wrong trade for both of us.
 */
export function PoweredBy({ className }: PoweredByProps) {
  const t = useTranslations("Print");

  return (
    <p
      data-slot="powered-by"
      className={cn("text-muted-foreground text-center text-xs", className)}
    >
      {t("poweredBy")}
    </p>
  );
}

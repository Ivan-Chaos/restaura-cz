"use client";

import { useLocale, useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/design-system/price";
import type { Money } from "@/lib/design-system/types";
import { Button } from "@/components/ui/button";

/**
 * Not shipped yet: a guest today never has anything to confirm past a menu.
 * Reserved for a future ordering flow's "review order" / "place order" bar.
 *
 * `sticky` + `pb-safe-bottom` rather than `fixed`: sticky keeps the bar in
 * normal flow (so it never overlaps content it hasn't scrolled past yet) and
 * still pins to the viewport bottom once its container is taller than the
 * screen, which is the only case this bar is meant for.
 */
export interface StickyActionBarProps {
  label: string;
  count?: number;
  total?: Money;
  onAction: () => void;
  disabled?: boolean;
  className?: string;
}

export function StickyActionBar({
  label,
  count,
  total,
  onAction,
  disabled,
  className,
}: StickyActionBarProps) {
  const t = useTranslations("Ordering");
  const locale = useLocale();

  return (
    <div
      data-slot="sticky-action-bar"
      data-ordering=""
      className={cn(
        "sticky inset-x-0 bottom-0 flex items-center justify-between gap-4 border-t border-border bg-surface-raised px-4 pt-3 pb-safe-bottom shadow-overlay",
        className,
      )}
    >
      <div className="flex flex-col text-sm text-muted-foreground">
        {count !== undefined ? <span>{t("items", { count })}</span> : null}
        {total ? <span className="text-price font-medium">{formatMoney(locale, total)}</span> : null}
      </div>
      <Button type="button" size="lg" disabled={disabled} onClick={onAction}>
        {label}
      </Button>
    </div>
  );
}

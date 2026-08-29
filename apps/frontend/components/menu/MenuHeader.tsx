import Image from "next/image";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import type { Establishment } from "@/lib/design-system/types";
import { cn } from "@/lib/utils";

/**
 * The identity strip atop every menu page.
 *
 * Logo, name and tagline sit in a `min-w-0` flex row so a very long name wraps
 * and truncates nothing — a guest needs to read the whole name, not an
 * ellipsis. `actions` is a plain slot (not baked-in switchers) so this
 * component stays agnostic of what the page wants top-right; the sample route
 * puts `LanguageSwitcher` + `AppearanceToggle` there.
 */
export interface MenuHeaderProps {
  establishment: Establishment;
  actions?: ReactNode;
  className?: string;
}

export function MenuHeader({
  establishment,
  actions,
  className,
}: MenuHeaderProps) {
  const t = useTranslations("Menu");
  const { name, tagline, logo, openingHours } = establishment;

  return (
    <header
      data-slot="menu-header"
      className={cn(
        "flex flex-col gap-4 border-b border-border py-6",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          {logo ? (
            <Image
              src={logo.src}
              alt={logo.alt}
              width={logo.width}
              height={logo.height}
              className="size-12 shrink-0 rounded-lg object-cover"
            />
          ) : null}
          <div className="min-w-0">
            <h1 className="font-display text-2xl leading-tight break-words sm:text-3xl">
              {name}
            </h1>
            {tagline ? (
              <p className="break-words text-muted-foreground">{tagline}</p>
            ) : null}
          </div>
        </div>
        {/*
          Not `shrink-0`: at a 200% system font size these controls are wider
          than a 320px phone, and refusing to shrink pushes the whole page
          sideways rather than wrapping.
        */}
        {actions ? (
          <div className="flex min-w-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>

      {openingHours && openingHours.length > 0 ? (
        <div>
          {/* A visible label rather than an <h2> — this strip sits between the
              page's <h1> and the first category's <h2>, and doesn't need its
              own entry in the heading outline to be discoverable. */}
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t("openingHours")}
          </p>
          <dl className="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            {openingHours.map((line) => (
              <div key={line.label} className="flex gap-1.5">
                <dt className="font-medium">{line.label}</dt>
                <dd className="text-muted-foreground">{line.hours}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </header>
  );
}

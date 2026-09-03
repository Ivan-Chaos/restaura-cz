import Image from "next/image";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { Container } from "@/components/layout/Container";
import type { Establishment } from "@/lib/design-system/types";
import type { HeaderLayout } from "@/lib/menu-display/presentation";
import { cn } from "@/lib/utils";

/**
 * The identity strip atop every menu page.
 *
 * Six layouts, one component (feature 005). `classic` is the original: logo,
 * name and tagline in a `min-w-0` flex row so a very long name wraps and
 * truncates nothing. The others rearrange the same content — a quiet ledger
 * line, a floating glass card, a full-bleed band with a condensed uppercase
 * masthead, an oversized editorial title, a centred serif masthead between two
 * rules. Colour, type and radius still come from the theme in scope; the layout
 * decides only where things go and how big they are.
 *
 * `actions` is a plain slot (not baked-in switchers) so this component stays
 * agnostic of what the page wants top-right.
 */
export interface MenuHeaderProps {
  establishment: Establishment;
  actions?: ReactNode;
  layout?: HeaderLayout;
  className?: string;
}

export function MenuHeader({
  establishment,
  actions,
  layout = "classic",
  className,
}: MenuHeaderProps) {
  const t = useTranslations("Menu");
  const { name, tagline, logo, openingHours } = establishment;
  const hasHours = Boolean(openingHours && openingHours.length > 0);
  const centered = layout === "band" || layout === "centered";

  const logoNode = logo ? (
    <Image
      src={logo.src}
      alt={logo.alt}
      width={logo.width}
      height={logo.height}
      className={cn(
        "shrink-0 object-cover",
        layout === "minimal" ? "size-9 rounded-md" : "size-12 rounded-lg",
        centered && "mx-auto size-14",
      )}
    />
  ) : null;

  const nameNode = (
    <h1
      className={cn(
        "font-display break-words leading-tight",
        layout === "classic" && "text-2xl sm:text-3xl",
        layout === "minimal" && "text-xl font-medium tracking-tight",
        layout === "glass" && "text-2xl font-semibold tracking-tight sm:text-3xl",
        layout === "band" && "text-4xl leading-none uppercase tracking-wide sm:text-6xl",
        layout === "editorial" && "text-5xl leading-none font-extrabold tracking-tight sm:text-7xl",
        layout === "centered" && "text-4xl tracking-tight sm:text-5xl",
      )}
    >
      {name}
    </h1>
  );

  const taglineNode = tagline ? (
    <p
      className={cn(
        "break-words",
        layout === "classic" && "text-muted-foreground",
        layout === "minimal" && "text-muted-foreground text-sm",
        layout === "glass" && "text-muted-foreground",
        layout === "band" && "text-primary mt-2 text-sm font-medium uppercase tracking-widest",
        layout === "editorial" && "text-muted-foreground mt-3 max-w-prose text-lg leading-relaxed",
        layout === "centered" && "text-muted-foreground mt-2 italic",
      )}
    >
      {tagline}
    </p>
  ) : null;

  const hoursNode = hasHours ? (
    <div className={cn(centered && "flex flex-col items-center")}>
      {/* A visible label rather than an <h2> — this strip sits between the
          page's <h1> and the first category's <h2>, and doesn't need its
          own entry in the heading outline to be discoverable. */}
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {t("openingHours")}
      </p>
      <dl
        className={cn(
          "mt-1 flex flex-wrap gap-x-6 gap-y-1 text-sm",
          centered && "justify-center",
        )}
      >
        {openingHours?.map((line) => (
          <div key={line.label} className="flex gap-1.5">
            <dt className="font-medium">{line.label}</dt>
            <dd className="text-muted-foreground">{line.hours}</dd>
          </div>
        ))}
      </dl>
    </div>
  ) : null;

  // Not `shrink-0`: at a 200% system font size these controls are wider than
  // a 320px phone, and refusing to shrink pushes the whole page sideways
  // rather than wrapping.
  const actionsNode = actions ? (
    <div className="flex min-w-0 flex-wrap items-center gap-2">{actions}</div>
  ) : null;

  // The row layouts: identity left, actions right, hours beneath.
  const rowContent = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          {logoNode}
          <div className="min-w-0">
            {nameNode}
            {taglineNode}
          </div>
        </div>
        {actionsNode}
      </div>
      {hoursNode}
    </>
  );

  // The centred layouts: actions on their own line, then the masthead.
  const centredContent = (
    <>
      {actionsNode ? <div className="flex justify-end">{actionsNode}</div> : null}
      <div className="flex flex-col items-center gap-3">
        {logoNode}
        <div className="min-w-0 max-w-3xl">
          {nameNode}
          {taglineNode}
        </div>
        {hoursNode}
      </div>
    </>
  );

  return (
    <header
      data-slot="menu-header"
      data-layout={layout}
      className={cn(
        layout === "classic" && "border-border border-b py-6",
        layout === "minimal" && "border-border border-b py-4",
        layout === "glass" && "pt-4",
        layout === "band" && "bg-card text-card-foreground border-primary border-b-4 py-8 text-center",
        layout === "editorial" && "py-10",
        layout === "centered" && "py-8 text-center",
        className,
      )}
    >
      <Container size="md" className="flex flex-col gap-4">
        {layout === "glass" ? (
          <div className="bg-panel border-panel-border backdrop-blur-panel shadow-card flex flex-col gap-4 rounded-2xl border p-panel">
            {rowContent}
          </div>
        ) : layout === "editorial" ? (
          <>
            <span aria-hidden="true" className="bg-primary block h-1.5 w-16 rounded-full" />
            {rowContent}
          </>
        ) : layout === "centered" ? (
          <div className="border-border mx-auto w-full max-w-2xl border-y py-8">{centredContent}</div>
        ) : layout === "band" ? (
          centredContent
        ) : (
          rowContent
        )}
      </Container>
    </header>
  );
}

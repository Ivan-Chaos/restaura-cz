import type { ComponentProps, ReactNode } from "react";
import type { VariantProps } from "class-variance-authority";

import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { isInternalHref } from "@/lib/landing/links";
import { cn } from "@/lib/utils";

/**
 * A call to action that looks like a button and behaves like the link it is.
 *
 * Deliberately styled with `buttonVariants` on a real anchor rather than built
 * from the `Button` primitive. Base UI's button expects a native `<button>`
 * underneath; handing it an anchor either warns, or — with `nativeButton`
 * turned off — replaces the link's own semantics with button ones, so the
 * control stops announcing itself as a link and loses "open in new tab". Every
 * call to action on this page navigates, so it stays a link and only borrows
 * the appearance.
 *
 * It also does not care whether its destination is a route, a form on someone
 * else's domain, or a mailbox: those are configured per deployment (see
 * `lib/landing/links.ts`), which makes "is this an app route?" a runtime
 * question. Getting it wrong is not cosmetic — an app route rendered as a bare
 * `<a>` loses its locale prefix, and an external URL handed to the localised
 * `Link` gets one bolted onto somebody else's domain.
 */
export interface CtaButtonProps
  extends Omit<ComponentProps<"a">, "href">,
    VariantProps<typeof buttonVariants> {
  href: string;
  children: ReactNode;
}

export function CtaButton({
  href,
  children,
  variant,
  size,
  className,
  ...props
}: CtaButtonProps) {
  const classes = cn(buttonVariants({ variant, size }), className);

  if (isInternalHref(href)) {
    return (
      <Link data-slot="cta" href={href} className={classes} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <a
      data-slot="cta"
      href={href}
      // These destinations are configured per deployment, not vetted per build.
      rel="noopener"
      className={classes}
      {...props}
    >
      {children}
    </a>
  );
}

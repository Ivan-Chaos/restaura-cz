import Image from "next/image";
import { useTranslations } from "next-intl";

import { Container } from "@/components/layout/Container";
import { Stack } from "@/components/layout/Stack";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Establishment } from "@/lib/design-system/types";
import { cn } from "@/lib/utils";

/**
 * The landing screen a guest sees right after scanning the table's QR code —
 * before a single dish. Its only job is to confirm they're in the right place
 * and give one unambiguous way forward, so it's centred, calm, and carries a
 * single call-to-action rather than a nav.
 *
 * `href` goes through the shadcn `Button`'s `render` prop rather than wrapping
 * `Link` around the button, so the anchor itself gets the button's focus ring
 * and ARIA state instead of a button nested inside a link.
 */
export interface MenuCoverProps {
  establishment: Establishment;
  href: string;
  className?: string;
}

export function MenuCover({ establishment, href, className }: MenuCoverProps) {
  const t = useTranslations("Menu");
  const { name, tagline, welcome, logo } = establishment;

  return (
    <Container
      size="sm"
      data-slot="menu-cover"
      className={cn(
        "flex min-h-dvh flex-col items-center justify-center gap-6 py-12 text-center",
        className,
      )}
    >
      <Stack gap={2} align="center">
        {logo ? (
          <Image
            src={logo.src}
            alt={logo.alt}
            width={logo.width}
            height={logo.height}
            priority
            className="mb-2 size-20 rounded-2xl object-cover shadow-card"
          />
        ) : null}
        <h1 className="break-words font-display text-3xl leading-tight">
          {name}
        </h1>
        {tagline ? (
          <p className="break-words text-muted-foreground">{tagline}</p>
        ) : null}
      </Stack>

      {welcome ? (
        <p className="max-w-prose text-balance">{welcome}</p>
      ) : null}

      <Button size="lg" render={<Link href={href} />}>
        {t("viewMenu")}
      </Button>
    </Container>
  );
}

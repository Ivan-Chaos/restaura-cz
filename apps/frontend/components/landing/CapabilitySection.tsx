import { ArrowRight, FileText, QrCode, Smartphone } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";

import { Reveal } from "@/components/landing/Reveal";
import { TableTent } from "@/components/landing/TableTent";
import { Container } from "@/components/layout/Container";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { assetSrc, getAsset } from "@/lib/landing/assets";
import type { Capability, CapabilityIconName } from "@/lib/landing/capabilities";
import { cn } from "@/lib/utils";

/**
 * One shipped capability: what it is, why an owner should care, and a picture
 * of it happening.
 *
 * Three of these carry the whole middle of the page, so the layout alternates
 * which side the picture falls on. That is the only reason `align` exists —
 * three identical blocks in a row read as a specification sheet, not an
 * argument.
 */

const ICONS: Record<CapabilityIconName, typeof Smartphone> = {
  Smartphone,
  FileText,
  QrCode,
};

export interface CapabilitySectionProps {
  capability: Capability;
  className?: string;
}

export function CapabilitySection({
  capability,
  className,
}: CapabilitySectionProps) {
  const t = useTranslations("Landing");
  const tVariants = useTranslations("VisualVariants");
  const Icon = ICONS[capability.icon];
  const headingId = `capability-${capability.id}-heading`;
  const asset = capability.asset ? getAsset(capability.asset) : undefined;

  return (
    <section
      data-slot="capability"
      data-capability={capability.id}
      aria-labelledby={headingId}
      className={cn("py-20 lg:py-28", className)}
    >
      <Container size="xl">
        <div className="grid items-center gap-10 md:grid-cols-2 lg:gap-16">
          <Reveal
            className={cn(
              "flex flex-col items-start gap-4",
              // On a narrow screen the picture always follows the words; the
              // alternation only makes sense once there are two columns.
              capability.align === "mediaLeft" && "md:order-last",
            )}
          >
            <span className="text-muted-foreground flex items-center gap-2 text-sm font-medium tracking-wide uppercase">
              <Icon aria-hidden="true" className="size-4" />
              {t(`capabilities.${capability.id}.eyebrow`)}
            </span>

            <h2
              id={headingId}
              className="font-display text-3xl leading-tight tracking-tight text-balance sm:text-4xl"
            >
              {t(`capabilities.${capability.id}.title`)}
            </h2>

            <p className="text-muted-foreground text-base leading-relaxed text-pretty">
              {t(`capabilities.${capability.id}.body`)}
            </p>

            {capability.demoHref && capability.demoLabelKey ? (
              <Link
                href={capability.demoHref}
                className="text-primary ring-offset-background focus-visible:ring-ring mt-1 inline-flex items-center gap-1.5 rounded-sm text-sm font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                {t(capability.demoLabelKey)}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            ) : null}

            {capability.styleDemos ? (
              // Real anchors with button styling: Base UI's Button expects a
              // native <button> and would replace the link semantics.
              <nav
                aria-label={t("capabilities.digitalMenu.styles")}
                data-slot="style-demos"
                className="mt-1 flex flex-col gap-1.5"
              >
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  {t("capabilities.digitalMenu.styles")}
                </p>
                <ul className="-ml-2 flex flex-wrap gap-1">
                  {capability.styleDemos.map(({ id, href }) => (
                    <li key={id}>
                      <Link
                        href={href}
                        data-style={id}
                        className={buttonVariants({ variant: "ghost", size: "sm" })}
                      >
                        {tVariants(`${id}.name`)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : null}
          </Reveal>

          <Reveal delay="sm" className="w-full">
            {asset ? (
              <Image
                src={assetSrc(asset)}
                alt={asset.altKey ? t(asset.altKey) : ""}
                width={asset.width}
                height={asset.height}
                sizes="(max-width: 768px) 100vw, 50vw"
                className="shadow-card h-auto w-full rounded-xl object-cover"
              />
            ) : (
              // The drawing keeps the same 4:3 frame as the photographs in the
              // other two sections, so the three blocks share one rhythm rather
              // than one of them sitting oddly light.
              <div className="bg-muted flex aspect-4/3 items-center justify-center rounded-xl p-8">
                <TableTent className="max-w-sm" />
              </div>
            )}
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

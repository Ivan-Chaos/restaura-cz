import { hasLocale, useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { use } from "react";

import { LanguageSwitcher } from "@/components/menu/LanguageSwitcher";
import { Container } from "@/components/layout/Container";
import { Stack } from "@/components/layout/Stack";
import { AppearanceToggle } from "@/components/theme/AppearanceToggle";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export default function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = use(params);
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = useTranslations("HomePage");

  return (
    <Container size="sm" className="flex flex-1 flex-col py-10">
      <Stack direction="row" justify="between" align="center">
        <LanguageSwitcher />
        <AppearanceToggle />
      </Stack>

      <Stack gap={6} className="flex-1 justify-center py-16">
        <h1 className="font-display text-4xl leading-tight tracking-tight">
          {t("title")}
        </h1>
        <p className="text-muted-foreground text-lg leading-relaxed">
          {t.rich("description", {
            code: (chunks) => (
              <code className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono text-sm">
                {chunks}
              </code>
            ),
          })}
        </p>
        <div>
          <Button size="lg" render={<Link href="/sample-menu" />}>
            {t("cta")}
          </Button>
        </div>
      </Stack>
    </Container>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { CompleteProfileForm } from "@/components/auth/CompleteProfileForm";
import { Container } from "@/components/layout/Container";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { completeProfileAction } from "@/lib/api/actions/auth";
import { sanitizeDestination, toDestination } from "@/lib/api/next-path";
import { requireSession } from "@/lib/api/session";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/complete-profile">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations({ locale, namespace: "Registration" });
  return { title: t("completeTitle"), robots: { index: false, follow: false } };
}

/**
 * The one signed-in page that deliberately sits outside the dashboard shell:
 * it exists for owners the shell's gate has turned away, so it cannot live
 * behind that gate.
 */
export default async function CompleteProfilePage({
  params,
  searchParams,
}: PageProps<"/[locale]/complete-profile">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const session = await requireSession(locale);

  // Nothing to complete: send them where they were going.
  const next = (await searchParams).next;
  if (session.profile) redirect({ href: toDestination(next), locale });

  return (
    <main className="flex flex-1 items-center justify-center py-12">
      <Container size="sm" className="max-w-md">
        <CompleteProfileForm
          action={completeProfileAction}
          locale={locale}
          next={sanitizeDestination(next) ?? undefined}
        />
      </Container>
    </main>
  );
}

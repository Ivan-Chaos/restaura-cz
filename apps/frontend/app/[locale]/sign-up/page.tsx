import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { RegistrationForm } from "@/components/auth/RegistrationForm";
import { Container } from "@/components/layout/Container";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { signUpAction } from "@/lib/api/actions/auth";
import { sanitizeDestination } from "@/lib/api/next-path";
import { getSession } from "@/lib/api/session";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/sign-up">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations({ locale, namespace: "Registration" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function SignUpPage({
  params,
  searchParams,
}: PageProps<"/[locale]/sign-up">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  // Someone already signed in has no business on this page.
  const session = await getSession();
  if (session) {
    redirect({ href: session.profile ? "/workspace" : "/complete-profile", locale });
  }

  const next = sanitizeDestination((await searchParams).next);

  return (
    <main className="flex flex-1 items-center justify-center py-12">
      <Container size="sm" className="max-w-md">
        <RegistrationForm action={signUpAction} locale={locale} next={next ?? undefined} />
      </Container>
    </main>
  );
}

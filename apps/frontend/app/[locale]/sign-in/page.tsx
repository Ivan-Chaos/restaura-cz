import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { AuthForm } from "@/components/auth/AuthForm";
import { Container } from "@/components/layout/Container";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { signInAction } from "@/lib/api/actions/auth";
import { sanitizeDestination } from "@/lib/api/next-path";
import { getSession } from "@/lib/api/session";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/sign-in">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations({ locale, namespace: "Auth" });
  return { title: t("signInTitle"), robots: { index: false, follow: false } };
}

export default async function SignInPage({
  params,
  searchParams,
}: PageProps<"/[locale]/sign-in">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const session = await getSession();
  if (session) {
    redirect({ href: session.profile ? "/workspace" : "/complete-profile", locale });
  }

  // Where the gate wanted them to end up, carried through sign-in so they
  // arrive at the page they asked for rather than a generic landing spot.
  const next = sanitizeDestination((await searchParams).next);

  return (
    <main className="flex flex-1 items-center justify-center py-12">
      <Container size="sm" className="max-w-sm">
        <AuthForm action={signInAction} locale={locale} next={next ?? undefined} />
      </Container>
    </main>
  );
}

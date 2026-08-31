import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { AuthForm } from "@/components/auth/AuthForm";
import { Container } from "@/components/layout/Container";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { signUpAction } from "@/lib/api/actions/auth";
import { getAccount } from "@/lib/api/session";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/sign-up">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations({ locale, namespace: "Auth" });
  return { title: t("signUpTitle"), robots: { index: false, follow: false } };
}

export default async function SignUpPage({ params }: PageProps<"/[locale]/sign-up">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  // Someone already signed in has no business on this page.
  if (await getAccount()) redirect({ href: "/workspace", locale });

  return (
    <main className="flex flex-1 items-center justify-center py-12">
      <Container size="sm" className="max-w-sm">
        <AuthForm mode="signUp" action={signUpAction} locale={locale} />
      </Container>
    </main>
  );
}

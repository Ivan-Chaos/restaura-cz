import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { VerifyEmailForm } from "@/components/auth/VerifyEmailForm";
import { Container } from "@/components/layout/Container";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import {
  resendCodeAction,
  signOutAction,
  verifyEmailAction,
} from "@/lib/api/actions/auth";
import { sanitizeDestination, toDestination } from "@/lib/api/next-path";
import { requireSession } from "@/lib/api/session";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/verify-email">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations({ locale, namespace: "VerifyEmail" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

/**
 * The confirmation step, outside the dashboard shell for the same reason
 * `/complete-profile` is: it exists for owners the shell's gate has turned
 * away, so it cannot live behind that gate.
 *
 * `requireSession` and not `requireVerified` — gating this page on being
 * verified is exactly the redirect loop to avoid.
 */
export default async function VerifyEmailPage({
  params,
  searchParams,
}: PageProps<"/[locale]/verify-email">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const session = await requireSession(locale);

  // Nothing to confirm: send them where they were going. Covers the back
  // button, a stale tab, and a second submit of the same code.
  const next = (await searchParams).next;
  if (session.account.emailVerified) redirect({ href: toDestination(next), locale });

  return (
    <main className="flex flex-1 items-center justify-center py-12">
      <Container size="sm" className="max-w-sm">
        <VerifyEmailForm
          action={verifyEmailAction}
          resendAction={resendCodeAction}
          signOutAction={signOutAction}
          email={session.account.email}
          locale={locale}
          next={sanitizeDestination(next) ?? undefined}
        />
      </Container>
    </main>
  );
}

import type { Metadata } from "next";
import { Fraunces, Nunito_Sans } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { AppearanceProvider } from "@/components/theme/AppearanceProvider";
import "../globals.css";

/**
 * Display face — a soft old-style serif that reads as hospitable rather than
 * corporate. `latin-ext` is not optional: without it Czech (ř, ě, ů) and German
 * (ß, ü) fall back mid-word.
 *
 * The variable it publishes is consumed by `--font-display` in the theme CSS;
 * `lib/design-system/themes.ts#FONT_VARIABLES` is the shared contract and
 * `tests/unit/themes.test.ts` asserts the two agree.
 */
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

/** Body face — high legibility at the small sizes a phone menu uses. */
const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: Omit<LayoutProps<"/[locale]">, "children">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Metadata" });
  const name = t("title");

  return {
    // Open Graph images must be absolute URLs. Declaring the base here lets
    // every page below write a relative path and lets the deployment decide the
    // origin; without it, a relative OG image is a build error.
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    ),
    title: {
      default: name,
      // Pages below inherit "<their title> | Restaura". A page that is not ours
      // to brand — a restaurant's own menu — opts out with `title.absolute`.
      template: `%s | ${name}`,
    },
    description: t("description"),
    applicationName: name,
    openGraph: {
      siteName: name,
      type: "website",
      locale,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Enables static rendering for this locale
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      // next-themes writes the appearance class before hydration; without this
      // React warns about the server/client mismatch it deliberately creates.
      suppressHydrationWarning
      className={`${fraunces.variable} ${nunitoSans.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/*
          No global <Toaster /> on purpose. Sonner costs ~10 KB gzipped in the
          shared bundle, and the guest menu — the route that matters most, on the
          worst connections — never raises a toast. A route that hosts a
          toast-raising component (ShareMenu, the dish form) mounts its own.
          Removing it is what brings the shared bundle inside the 200 KB budget.
        */}
        <NextIntlClientProvider>
          <AppearanceProvider>{children}</AppearanceProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

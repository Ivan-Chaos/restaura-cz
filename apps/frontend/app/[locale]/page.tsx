import { hasLocale, useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { use } from "react";
import { routing } from "@/i18n/routing";
import LocaleSwitcher from "@/components/LocaleSwitcher";

export default function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = use(params);
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = useTranslations("HomePage");

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <LocaleSwitcher />
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            {t("title")}
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            {t.rich("description", {
              code: (chunks) => (
                <code className="rounded bg-black/[.06] px-1.5 py-0.5 font-mono text-[0.9em] dark:bg-white/[.08]">
                  {chunks}
                </code>
              ),
            })}
          </p>
        </div>
        <button
          type="button"
          className="flex h-12 items-center justify-center rounded-full bg-foreground px-5 text-background font-medium transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          {t("cta")}
        </button>
      </main>
    </div>
  );
}

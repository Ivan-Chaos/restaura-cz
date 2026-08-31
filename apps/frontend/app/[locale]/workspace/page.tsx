import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Container } from "@/components/layout/Container";
import { InlineTextForm } from "@/components/workspace/InlineTextForm";
import { MenuList } from "@/components/workspace/MenuList";
import { SignOutButton } from "@/components/workspace/SignOutButton";
import { routing } from "@/i18n/routing";
import { signOutAction } from "@/lib/api/actions/auth";
import { createMenuAction, deleteMenuAction, listMenus } from "@/lib/api/actions/menus";
import { requireAccount } from "@/lib/api/session";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/workspace">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations({ locale, namespace: "Workspace" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

export default async function WorkspacePage({ params }: PageProps<"/[locale]/workspace">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  // Renders per owner, so it can never be static.
  const account = await requireAccount(locale);
  const t = await getTranslations({ locale, namespace: "Workspace" });

  const result = await listMenus();
  const menus = result.ok ? result.data.menus : [];

  return (
    <main className="flex-1 py-10">
      <Container size="lg" className="flex flex-col gap-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
            <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <p className="text-muted-foreground text-sm">
              {t("signedInAs", { email: account.email })}
            </p>
            <SignOutButton locale={locale} action={signOutAction} />
          </div>
        </header>

        <section
          aria-labelledby="create-menu-heading"
          className="border-border bg-card rounded-lg border p-4"
        >
          <h2 id="create-menu-heading" className="mb-3 text-sm font-medium">
            {t("createTitle")}
          </h2>
          <InlineTextForm
            action={createMenuAction}
            field="name"
            label={t("nameLabel")}
            placeholder={t("namePlaceholder")}
            submitLabel={t("create")}
            pendingLabel={t("create")}
            hidden={{ locale }}
          />
        </section>

        <MenuList menus={menus} locale={locale} deleteAction={deleteMenuAction} />
      </Container>
    </main>
  );
}

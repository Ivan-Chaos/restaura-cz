import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Container } from "@/components/layout/Container";
import { InlineTextForm } from "@/components/workspace/InlineTextForm";
import { MenuCardList } from "@/components/workspace/MenuCardList";
import { routing } from "@/i18n/routing";
import { createMenuAction, deleteMenuAction, listMenus } from "@/lib/api/actions/menus";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/workspace/menus">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations({ locale, namespace: "Workspace" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

export default async function MenusPage({ params }: PageProps<"/[locale]/workspace/menus">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  // The shell's gate has already established there is a signed-in owner with a
  // complete profile, so this page only has to fetch what it shows.
  const t = await getTranslations({ locale, namespace: "Workspace" });

  const result = await listMenus();
  const menus = result.ok ? result.data.menus : [];

  const createForm = (
    <InlineTextForm
      action={createMenuAction}
      field="name"
      label={t("nameLabel")}
      placeholder={t("namePlaceholder")}
      submitLabel={t("create")}
      pendingLabel={t("create")}
      hidden={{ locale }}
      className="w-full"
    />
  );

  // A div, not a main: the shell's SidebarInset is already this page's main
  // landmark, and nesting a second one inside it is invalid.
  return (
    <div className="flex-1 py-8">
      <Container size="lg" className="flex flex-col gap-8">
        <header className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
        </header>

        {/*
          With menus on the page the create form is a secondary affordance above
          the grid; with none it *is* the page, so it moves inside the empty
          state rather than asking the owner to find it.
        */}
        {menus.length > 0 ? (
          <section
            aria-labelledby="create-menu-heading"
            className="border-border bg-card rounded-lg border p-4"
          >
            <h2 id="create-menu-heading" className="mb-3 text-sm font-medium">
              {t("createTitle")}
            </h2>
            {createForm}
          </section>
        ) : null}

        <MenuCardList
          menus={menus}
          locale={locale}
          deleteAction={deleteMenuAction}
          emptyAction={createForm}
        />
      </Container>
    </div>
  );
}

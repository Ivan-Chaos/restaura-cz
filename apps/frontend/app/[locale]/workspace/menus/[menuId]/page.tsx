import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Container } from "@/components/layout/Container";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { InlineTextForm } from "@/components/workspace/InlineTextForm";
import { PublishControls } from "@/components/workspace/PublishControls";
import { SectionEditor } from "@/components/workspace/SectionEditor";
import { VariantSwitcher } from "@/components/workspace/VariantSwitcher";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import {
  addItemAction,
  addSectionAction,
  deleteItemAction,
  deleteSectionAction,
  getMenu,
  moveItemAction,
  moveSectionAction,
  renameMenuAction,
  renameSectionAction,
  updateItemAction,
} from "@/lib/api/actions/menus";
import { publishAction, unpublishAction } from "@/lib/api/actions/publish";
import { requireAccount } from "@/lib/api/session";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/workspace/menus/[menuId]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations({ locale, namespace: "Workspace" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

/** The absolute address an owner shares. Falls back to localhost in development. */
function publicUrlFor(locale: string, slug: string | null): string | null {
  if (!slug) return null;
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return `${origin.replace(/\/$/, "")}/${locale}/m/${slug}`;
}

export default async function MenuEditorPage({
  params,
}: PageProps<"/[locale]/workspace/menus/[menuId]">) {
  const { locale, menuId } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  await requireAccount(locale);
  const t = await getTranslations({ locale, namespace: "MenuEditor" });

  const result = await getMenu(menuId);
  // A menu that belongs to somebody else answers 404 exactly like a missing
  // one, so this single branch covers both.
  if (!result.ok) notFound();
  const { menu } = result.data;

  return (
    <main className="flex-1 py-10">
      <Container size="lg" className="flex flex-col gap-6">
        <Link href="/workspace" className="text-muted-foreground w-fit text-sm underline underline-offset-4">
          {t("back")}
        </Link>

        <h1 className="text-2xl font-semibold tracking-tight">{menu.name}</h1>

        <PublishControls
          status={menu.status}
          publicUrl={publicUrlFor(locale, menu.publicSlug)}
          locale={locale}
          menuId={menu.id}
          publishAction={publishAction}
          unpublishAction={unpublishAction}
        />

        <section
          aria-labelledby="menu-name-heading"
          className="border-border bg-card rounded-lg border p-4"
        >
          <h2 id="menu-name-heading" className="mb-3 text-sm font-medium">
            {t("nameLabel")}
          </h2>
          <InlineTextForm
            action={renameMenuAction}
            field="name"
            label={t("nameLabel")}
            labelHidden
            submitLabel={t("rename")}
            pendingLabel={t("saving")}
            defaultValue={menu.name}
            hidden={{ locale, menuId: menu.id }}
          />
        </section>

        <VariantSwitcher selected={menu.visualVariant} />

        <section aria-labelledby="sections-heading" className="flex flex-col gap-4">
          <h2 id="sections-heading" className="text-lg font-medium">
            {t("sections")}
          </h2>

          {menu.sections.length === 0 ? (
            <Empty>
              <EmptyTitle>{t("noSections")}</EmptyTitle>
              <EmptyDescription>{t("noSectionsHint")}</EmptyDescription>
            </Empty>
          ) : (
            menu.sections.map((section, index) => (
              <SectionEditor
                key={section.id}
                section={section}
                locale={locale}
                menuId={menu.id}
                isFirst={index === 0}
                isLast={index === menu.sections.length - 1}
                renameAction={renameSectionAction}
                moveSectionAction={moveSectionAction}
                deleteSectionAction={deleteSectionAction}
                addItemAction={addItemAction}
                updateItemAction={updateItemAction}
                moveItemAction={moveItemAction}
                deleteItemAction={deleteItemAction}
              />
            ))
          )}

          <div className="border-border bg-card rounded-lg border p-4">
            <h3 className="mb-3 text-sm font-medium">{t("addSection")}</h3>
            <InlineTextForm
              // Remounts once the section count changes, clearing the input.
              key={`add-section-${menu.sections.length}`}
              action={addSectionAction}
              field="title"
              label={t("addSectionLabel")}
              placeholder={t("addSectionPlaceholder")}
              submitLabel={t("addSection")}
              pendingLabel={t("saving")}
              hidden={{ locale, menuId: menu.id }}
            />
          </div>
        </section>
      </Container>
    </main>
  );
}

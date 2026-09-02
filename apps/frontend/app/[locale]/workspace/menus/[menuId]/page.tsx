import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Container } from "@/components/layout/Container";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { EditableTitle } from "@/components/workspace/EditableTitle";
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
  duplicateItemAction,
  getMenu,
  moveItemAction,
  moveSectionAction,
  renameMenuAction,
  renameSectionAction,
  updateItemAction,
} from "@/lib/api/actions/menus";
import { publishAction, unpublishAction } from "@/lib/api/actions/publish";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/workspace/menus/[menuId]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations({ locale, namespace: "Workspace" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

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

  const t = await getTranslations({ locale, namespace: "MenuEditor" });

  const result = await getMenu(menuId);

  if (!result.ok) notFound();
  const { menu } = result.data;

  return (
    <div className="flex-1 py-10">
      <Container size="lg" className="flex flex-col gap-6">
        <Link
          href="/workspace"
          className="text-muted-foreground w-fit text-sm underline underline-offset-4"
        >
          {t("back")}
        </Link>

        <EditableTitle
          value={menu.name}
          as="h1"
          action={renameMenuAction}
          field="name"
          label={t("nameLabel")}
          renameLabel={t("renameMenu")}
          submitLabel={t("rename")}
          pendingLabel={t("saving")}
          successMessage={t("menuRenamed")}
          hidden={{ locale, menuId: menu.id }}
          headingClassName="text-2xl font-semibold tracking-tight"
        />

        <PublishControls
          status={menu.status}
          publicUrl={publicUrlFor(locale, menu.publicSlug)}
          locale={locale}
          menuId={menu.id}
          publishAction={publishAction}
          unpublishAction={unpublishAction}
        />

        <VariantSwitcher selected={menu.visualVariant} />

        <section
          aria-labelledby="sections-heading"
          className="flex flex-col gap-4"
        >
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
                duplicateItemAction={duplicateItemAction}
              />
            ))
          )}

          <div className="border-border bg-muted/60 rounded-lg border border-dashed p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
              <Plus aria-hidden="true" className="size-4" />
              {t("addSection")}
            </h3>
            <InlineTextForm
              action={addSectionAction}
              field="title"
              label={t("addSectionLabel")}
              placeholder={t("addSectionPlaceholder")}
              submitLabel={t("addSection")}
              pendingLabel={t("saving")}
              successMessage={t("sectionAdded")}
              resetOnSuccess
              hidden={{ locale, menuId: menu.id }}
            />
          </div>
        </section>
      </Container>
    </div>
  );
}

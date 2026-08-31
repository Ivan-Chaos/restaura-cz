import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import type { FormState } from "@/lib/api/form-state";
import type { MenuSectionView } from "@/lib/api/types";

import { ConfirmDialog } from "./ConfirmDialog";
import { InlineTextForm } from "./InlineTextForm";
import { ItemForm } from "./ItemForm";
import { ItemRow } from "./ItemRow";

export interface SectionEditorProps {
  section: MenuSectionView;
  locale: string;
  menuId: string;
  isFirst: boolean;
  isLast: boolean;
  renameAction: (state: FormState, formData: FormData) => Promise<FormState>;
  moveSectionAction: (formData: FormData) => Promise<void>;
  deleteSectionAction: (formData: FormData) => Promise<void>;
  addItemAction: (state: FormState, formData: FormData) => Promise<FormState>;
  updateItemAction: (state: FormState, formData: FormData) => Promise<FormState>;
  moveItemAction: (formData: FormData) => Promise<void>;
  deleteItemAction: (formData: FormData) => Promise<void>;
}

/**
 * One section and its dishes.
 *
 * A Server Component: only the pieces that genuinely need the browser — the
 * forms and the confirm dialogs — are client components, so the editor ships
 * markup rather than a renderer.
 */
export function SectionEditor({
  section,
  locale,
  menuId,
  isFirst,
  isLast,
  renameAction,
  moveSectionAction,
  deleteSectionAction,
  addItemAction,
  updateItemAction,
  moveItemAction,
  deleteItemAction,
}: SectionEditorProps) {
  const t = useTranslations("MenuEditor");

  const hidden = { locale, menuId, sectionId: section.id };

  return (
    <section
      aria-labelledby={`section-${section.id}-heading`}
      className="border-border bg-card rounded-lg border p-4"
    >
      <h3 id={`section-${section.id}-heading`} className="sr-only">
        {section.title}
      </h3>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <InlineTextForm
          action={renameAction}
          field="title"
          label={t("sectionTitleLabel")}
          labelHidden
          submitLabel={t("renameSection")}
          pendingLabel={t("saving")}
          defaultValue={section.title}
          hidden={hidden}
          className="min-w-60 flex-1"
        />

        <div className="flex items-center gap-1">
          <form action={moveSectionAction}>
            {Object.entries({ ...hidden, position: String(section.position - 1) }).map(
              ([name, value]) => (
                <input key={name} type="hidden" name={name} value={value} />
              ),
            )}
            <Button type="submit" variant="ghost" size="sm" disabled={isFirst}>
              {t("moveUp")}
            </Button>
          </form>

          <form action={moveSectionAction}>
            {Object.entries({ ...hidden, position: String(section.position + 1) }).map(
              ([name, value]) => (
                <input key={name} type="hidden" name={name} value={value} />
              ),
            )}
            <Button type="submit" variant="ghost" size="sm" disabled={isLast}>
              {t("moveDown")}
            </Button>
          </form>

          <ConfirmDialog
            triggerLabel={t("deleteSection")}
            title={t("deleteSectionTitle")}
            description={t("deleteSectionBody", { title: section.title })}
            confirmLabel={t("confirmDelete")}
            cancelLabel={t("cancel")}
            action={deleteSectionAction}
            hidden={hidden}
          />
        </div>
      </div>

      {section.items.length === 0 ? (
        <Empty className="py-6">
          <EmptyTitle>{t("noItems")}</EmptyTitle>
          <EmptyDescription>{t("addItem")}</EmptyDescription>
        </Empty>
      ) : (
        <ul className="mt-4">
          {section.items.map((item, index) => (
            <ItemRow
              key={item.id}
              item={item}
              hidden={hidden}
              updateAction={updateItemAction}
              deleteAction={deleteItemAction}
              moveAction={moveItemAction}
              isFirst={index === 0}
              isLast={index === section.items.length - 1}
            />
          ))}
        </ul>
      )}

      <div className="border-border mt-4 border-t pt-4">
        <h4 className="mb-3 text-sm font-medium">{t("addItem")}</h4>
        <ItemForm
          // Remounts after a successful add so the inputs come back empty
          // instead of holding the dish that was just saved.
          key={`add-${section.id}-${section.items.length}`}
          action={addItemAction}
          hidden={hidden}
          idPrefix={`add-item-${section.id}`}
          submitLabel={t("addItem")}
        />
      </div>
    </section>
  );
}

import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import type { ServerAction } from "@/hooks/use-action-form";
import type { MenuSectionView } from "@/lib/api/types";

import { ConfirmDialog } from "./ConfirmDialog";
import { EditableTitle } from "./EditableTitle";
import { ItemForm } from "./ItemForm";
import { ItemRow } from "./ItemRow";

export interface SectionEditorProps {
  section: MenuSectionView;
  locale: string;
  menuId: string;
  isFirst: boolean;
  isLast: boolean;
  renameAction: ServerAction;
  moveSectionAction: (formData: FormData) => Promise<void>;
  deleteSectionAction: (formData: FormData) => Promise<void>;
  addItemAction: ServerAction;
  updateItemAction: ServerAction;
  moveItemAction: (formData: FormData) => Promise<void>;
  deleteItemAction: (formData: FormData) => Promise<void>;
  duplicateItemAction: (formData: FormData) => Promise<void>;
}


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
  duplicateItemAction,
}: SectionEditorProps) {
  const t = useTranslations("MenuEditor");

  const hidden = { locale, menuId, sectionId: section.id };

  return (
    <section
      aria-labelledby={`section-${section.id}-heading`}
      className="border-border bg-card rounded-lg border p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <EditableTitle
          value={section.title}
          as="h3"
          id={`section-${section.id}-heading`}
          action={renameAction}
          field="title"
          label={t("sectionTitleLabel")}
          renameLabel={t("renameSectionButton")}
          submitLabel={t("renameSection")}
          pendingLabel={t("saving")}
          successMessage={t("sectionRenamed")}
          hidden={hidden}
          headingClassName="text-lg font-medium"
        />

        <div className="flex items-center gap-1">
          <form action={moveSectionAction}>
            {Object.entries({ ...hidden, position: String(section.position - 1) }).map(
              ([name, value]) => (
                <input key={name} type="hidden" name={name} value={value} />
              ),
            )}
            <Button type="submit" variant="ghost" size="icon" disabled={isFirst}>
              <ChevronUp aria-hidden="true" />
              <span className="sr-only">{t("moveUp")}</span>
            </Button>
          </form>

          <form action={moveSectionAction}>
            {Object.entries({ ...hidden, position: String(section.position + 1) }).map(
              ([name, value]) => (
                <input key={name} type="hidden" name={name} value={value} />
              ),
            )}
            <Button type="submit" variant="ghost" size="icon" disabled={isLast}>
              <ChevronDown aria-hidden="true" />
              <span className="sr-only">{t("moveDown")}</span>
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
          <EmptyDescription>{t("noItemsHint")}</EmptyDescription>
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
              duplicateAction={duplicateItemAction}
              moveAction={moveItemAction}
              isFirst={index === 0}
              isLast={index === section.items.length - 1}
            />
          ))}
        </ul>
      )}


      <div className="border-border bg-muted/60 mt-4 rounded-md border border-dashed p-4">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-medium">
          <Plus aria-hidden="true" className="size-4" />
          {t("addItem")}
        </h4>
        <ItemForm
          action={addItemAction}
          hidden={hidden}
          idPrefix={`add-item-${section.id}`}
          submitLabel={t("addItem")}
          successMessage={t("itemAdded")}
        />
      </div>
    </section>
  );
}

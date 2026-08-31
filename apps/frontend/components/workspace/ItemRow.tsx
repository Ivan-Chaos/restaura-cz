"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/api/form-state";
import type { MenuItemView } from "@/lib/api/types";

import { ConfirmDialog } from "./ConfirmDialog";
import { ItemForm } from "./ItemForm";

export interface ItemRowProps {
  item: MenuItemView;
  /** Ids the actions need: locale, menuId, sectionId. */
  hidden: Record<string, string>;
  updateAction: (state: FormState, formData: FormData) => Promise<FormState>;
  deleteAction: (formData: FormData) => Promise<void>;
  moveAction: (formData: FormData) => Promise<void>;
  isFirst: boolean;
  isLast: boolean;
}

/**
 * One dish in the editor: a read-only row that swaps in place for the edit form.
 * Editing inline keeps the dish in the context of its section, which is how the
 * owner is thinking about it.
 */
export function ItemRow({
  item,
  hidden,
  updateAction,
  deleteAction,
  moveAction,
  isFirst,
  isLast,
}: ItemRowProps) {
  const t = useTranslations("MenuEditor");
  const format = useFormatter();
  const [editing, setEditing] = useState(false);

  const itemHidden = { ...hidden, itemId: item.id };

  if (editing) {
    return (
      <li className="border-border border-b py-4 last:border-b-0">
        <ItemForm
          action={updateAction}
          hidden={itemHidden}
          idPrefix={`item-${item.id}`}
          submitLabel={t("save")}
          onCancel={() => setEditing(false)}
          // Back to the read-only row once the save lands, so the owner can see
          // what was stored rather than being left staring at the form.
          onSuccess={() => setEditing(false)}
          defaults={{
            name: item.name,
            description: item.description ?? "",
            priceCzk: String(item.priceCzk),
          }}
        />
      </li>
    );
  }

  return (
    <li className="border-border flex flex-wrap items-start gap-x-4 gap-y-2 border-b py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="font-medium">{item.name}</p>
        {item.description ? (
          <p className="text-muted-foreground text-sm">{item.description}</p>
        ) : null}
      </div>

      <p className="text-price font-medium tabular-nums">
        {format.number(item.priceCzk)} {t("priceSuffix")}
      </p>

      <div className="flex items-center gap-1">
        {/*
          Reordering is a plain form post: it needs no client state, so it costs
          the owner no JavaScript and still works if hydration has not finished.
        */}
        <form action={moveAction}>
          {Object.entries({ ...itemHidden, position: String(item.position - 1) }).map(
            ([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ),
          )}
          <Button type="submit" variant="ghost" size="sm" disabled={isFirst}>
            {t("moveUp")}
          </Button>
        </form>

        <form action={moveAction}>
          {Object.entries({ ...itemHidden, position: String(item.position + 1) }).map(
            ([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ),
          )}
          <Button type="submit" variant="ghost" size="sm" disabled={isLast}>
            {t("moveDown")}
          </Button>
        </form>

        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
          {t("edit")}
        </Button>

        <ConfirmDialog
          triggerLabel={t("deleteItem")}
          title={t("deleteItemTitle")}
          description={t("deleteItemBody", { name: item.name })}
          confirmLabel={t("confirmDelete")}
          cancelLabel={t("cancel")}
          action={deleteAction}
          hidden={itemHidden}
        />
      </div>
    </li>
  );
}

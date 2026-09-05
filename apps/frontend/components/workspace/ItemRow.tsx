"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown, ChevronUp, Copy, EyeOff, Pencil } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { AvailabilityBadge } from "@/components/menu/AvailabilityBadge";
import { DietaryMarkerList } from "@/components/menu/DietaryMarkerList";
import { SpiceLevel } from "@/components/menu/SpiceLevel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney, formatPriceInput } from "@/lib/design-system/price";
import type { ServerAction } from "@/hooks/use-action-form";
import type { MenuItemView } from "@/lib/api/types";
import { toImageModel } from "@/lib/menu-display/adapter";

import { ConfirmDialog } from "./ConfirmDialog";
import { ItemForm } from "./ItemForm";

export interface ItemRowProps {
  item: MenuItemView;
  /** Ids the actions need: locale, menuId, sectionId. */
  hidden: Record<string, string>;
  updateAction: ServerAction;
  deleteAction: (formData: FormData) => Promise<void>;
  duplicateAction: (formData: FormData) => Promise<void>;
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
  duplicateAction,
  moveAction,
  isFirst,
  isLast,
}: ItemRowProps) {
  const t = useTranslations("MenuEditor");
  const tAvailability = useTranslations("Availability");
  const locale = useLocale();
  const [editing, setEditing] = useState(false);

  const itemHidden = { ...hidden, itemId: item.id };
  const isHidden = item.availability === "hidden";
  const declaresSomething =
    item.dietary.length > 0 ||
    item.allergens.length > 0 ||
    item.warnings.length > 0 ||
    item.spiceLevel > 0;

  if (editing) {
    return (
      <li className="border-border bg-background my-2 border p-4 shadow-xs">
        <ItemForm
          action={updateAction}
          hidden={itemHidden}
          idPrefix={`item-${item.id}`}
          submitLabel={t("save")}
          successMessage={t("itemSaved")}
          onCancel={() => setEditing(false)}
          // Back to the read-only row once the save lands, so the owner can see
          // what was stored rather than being left staring at the form.
          onSuccess={() => setEditing(false)}
          currentImage={toImageModel(item.image, item.name) ?? null}
          defaults={{
            name: item.name,
            description: item.description ?? "",
            // The owner's own notation, not JavaScript's: a Czech owner who
            // typed 56,50 should not reopen the dish to find 56.5.
            priceCzk: formatPriceInput(locale, item.priceCzk),
            dietary: item.dietary,
            allergens: item.allergens,
            warnings: item.warnings,
            spiceLevel: item.spiceLevel as 0 | 1 | 2 | 3,
            availability: item.availability,
          }}
        />
      </li>
    );
  }

  return (
    <li className="border-border hover:bg-muted/40 -mx-2 flex flex-wrap items-start gap-x-4 gap-y-2  border-b px-2 py-3 last:border-b-0">
      {/*
        A thumbnail only where there is one. A dish without a photograph gets
        nothing at all — no placeholder box, which would read as something
        missing rather than as a choice the owner made.
      */}
      {item.image ? (
        <Image
          src={item.image.url}
          alt={item.name}
          width={64}
          height={48}
          sizes="64px"
          className="h-12 w-16 shrink-0 rounded-md object-cover"
        />
      ) : null}

      <div className="min-w-0 flex-1">
        <p className="font-medium">{item.name}</p>
        {item.description ? (
          <p className="text-muted-foreground text-sm">{item.description}</p>
        ) : null}

        {/*
          What the dish declares, read back where it was entered. Without this
          an owner cannot tell a dish they have described from one they have
          not, and the only way to check would be to open the form again.
        */}
        {isHidden || item.availability !== "available" || declaresSomething ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {item.availability === "hidden" ? (
              // AvailabilityBadge knows only the three states a guest can
              // see, and rightly so — this one exists only in the editor.
              <Badge variant="secondary">
                <EyeOff aria-hidden="true" />
                {tAvailability("hidden")}
              </Badge>
            ) : (
              <AvailabilityBadge status={item.availability} />
            )}
            {item.spiceLevel > 0 ? (
              <SpiceLevel level={item.spiceLevel as 1 | 2 | 3} />
            ) : null}
            <DietaryMarkerList
              dietary={item.dietary}
              allergens={item.allergens}
              warnings={item.warnings}
            />
          </div>
        ) : null}
      </div>

      <p className="text-price font-medium tabular-nums">
        {formatMoney(locale, { amount: item.priceCzk, currency: "CZK" })}
      </p>

      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          <Pencil aria-hidden="true" />
          {t("edit")}
        </Button>

        {/*
          Duplicating and reordering are plain form posts: they need no client
          state, so they cost the owner no JavaScript and still work if
          hydration has not finished.
        */}
        <form action={duplicateAction}>
          {Object.entries(itemHidden).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <Button type="submit" variant="ghost" size="icon">
            <Copy aria-hidden="true" />
            <span className="sr-only">{t("duplicateItem")}</span>
          </Button>
        </form>

        <form action={moveAction}>
          {Object.entries({
            ...itemHidden,
            position: String(item.position - 1),
          }).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <Button type="submit" variant="ghost" size="icon" disabled={isFirst}>
            <ChevronUp aria-hidden="true" />
            <span className="sr-only">{t("moveUp")}</span>
          </Button>
        </form>

        <form action={moveAction}>
          {Object.entries({
            ...itemHidden,
            position: String(item.position + 1),
          }).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <Button type="submit" variant="ghost" size="icon" disabled={isLast}>
            <ChevronDown aria-hidden="true" />
            <span className="sr-only">{t("moveDown")}</span>
          </Button>
        </form>

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

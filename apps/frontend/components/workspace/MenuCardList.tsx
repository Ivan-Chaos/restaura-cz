import type { ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import type { MenuSummary } from "@/lib/api/types";

import { ConfirmDialog } from "./ConfirmDialog";

export interface MenuCardListProps {
  menus: MenuSummary[];
  locale: string;
  deleteAction: (formData: FormData) => Promise<void>;
  /** Rendered inside the empty state, so the first menu is one action away. */
  emptyAction?: ReactNode;
}

/**
 * The owner's menus, as menus.
 *
 * A menu is the thing a restaurant hands a guest, and it reads like one here:
 * the display face, a rule under the name, a card that looks like a folded
 * card. That is not decoration for its own sake — it is what makes a wall of
 * "Lunch / Dinner / Winter" scannable at a glance instead of a list of strings.
 * Every value comes from the design tokens, so the effect survives a theme
 * change.
 *
 * The whole card is the link to the editor, with the destructive action kept
 * outside it: a delete button nested inside a link is neither operable by
 * keyboard nor safe by mouse.
 */
export function MenuCardList({ menus, locale, deleteAction, emptyAction }: MenuCardListProps) {
  const t = useTranslations("Workspace");
  const tPublish = useTranslations("Publish");
  const format = useFormatter();

  if (menus.length === 0) {
    return (
      <Empty className="border-border border">
        <EmptyHeader>
          <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
          <EmptyDescription>{t("emptyDescription")}</EmptyDescription>
        </EmptyHeader>
        {emptyAction ? <EmptyContent>{emptyAction}</EmptyContent> : null}
      </Empty>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {menus.map((menu) => {
        const published = menu.status === "published";

        return (
          <li key={menu.id} className="group/menu relative flex">
            <article className="border-border bg-card hover:border-primary/40 focus-within:border-primary/40 flex w-full flex-col gap-4 rounded-lg border p-5 shadow-sm transition-colors">
              <div className="flex flex-col gap-3">
                <Badge variant={published ? "default" : "secondary"} className="w-fit">
                  {published ? tPublish("published") : tPublish("draft")}
                </Badge>

                {/*
                  The link stretches over the card, so the target is the card
                  and the accessible name is the menu's own name.
                */}
                <h3 className="font-heading text-xl leading-tight font-semibold text-balance">
                  <Link href={`/workspace/menus/${menu.id}`} className="after:absolute after:inset-0">
                    {menu.name}
                  </Link>
                </h3>

                <span aria-hidden="true" className="bg-border h-px w-12" />

                <p className="text-muted-foreground truncate text-sm">
                  {published && menu.publicSlug ? `/m/${menu.publicSlug}` : t("notPublishedYet")}
                </p>
              </div>

              <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                <span className="text-muted-foreground text-xs">
                  {t("updatedAt", {
                    date: format.dateTime(new Date(menu.updatedAt), {
                      dateStyle: "medium",
                    }),
                  })}
                </span>

                {/* Lifted above the card link so it stays clickable. */}
                <span className="relative z-10">
                  <ConfirmDialog
                    triggerLabel={t("delete")}
                    title={t("deleteTitle")}
                    description={t("deleteBody", { name: menu.name })}
                    confirmLabel={t("deleteConfirm")}
                    cancelLabel={t("cancel")}
                    action={deleteAction}
                    hidden={{ locale, menuId: menu.id }}
                  />
                </span>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}

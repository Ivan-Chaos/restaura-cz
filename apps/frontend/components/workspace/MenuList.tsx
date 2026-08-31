import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import type { MenuSummary } from "@/lib/api/types";

import { ConfirmDialog } from "./ConfirmDialog";

export interface MenuListProps {
  menus: MenuSummary[];
  locale: string;
  deleteAction: (formData: FormData) => Promise<void>;
}

/** The workspace's index: every menu the owner has, and its publish state. */
export function MenuList({ menus, locale, deleteAction }: MenuListProps) {
  const t = useTranslations("Workspace");
  const tPublish = useTranslations("Publish");

  if (menus.length === 0) {
    return (
      <Empty>
        <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
        <EmptyDescription>{t("emptyDescription")}</EmptyDescription>
      </Empty>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {menus.map((menu) => (
        <li
          key={menu.id}
          className="border-border bg-card flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border p-4"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{menu.name}</p>
            {menu.status === "published" && menu.publicSlug ? (
              <p className="text-muted-foreground truncate text-sm">/m/{menu.publicSlug}</p>
            ) : null}
          </div>

          <Badge variant={menu.status === "published" ? "default" : "secondary"}>
            {menu.status === "published" ? tPublish("published") : tPublish("draft")}
          </Badge>

          <div className="flex items-center gap-1">
            <Link
              href={`/workspace/menus/${menu.id}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {t("open")}
            </Link>

            <ConfirmDialog
              triggerLabel={t("delete")}
              title={t("deleteTitle")}
              description={t("deleteBody", { name: menu.name })}
              confirmLabel={t("deleteConfirm")}
              cancelLabel={t("cancel")}
              action={deleteAction}
              hidden={{ locale, menuId: menu.id }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

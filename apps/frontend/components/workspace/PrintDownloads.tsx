"use client";

import { useState } from "react";
import { FileText, QrCode } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import type { PlanId } from "@/lib/landing/plans";
import type { MenuStatus } from "@/lib/api/types";
import { canRemoveBranding } from "@/lib/plans/entitlements";

import { PrintDownloadDialog, type PrintKind } from "./PrintDownloadDialog";

export interface PrintDownloadsProps {
  locale: string;
  menuId: string;
  menuName: string;
  status: MenuStatus;
  /** A menu with no dishes has nothing to print. */
  hasDishes: boolean;
  plan: PlanId;
}

/**
 * The two things an owner can take away from a menu: the menu itself, on paper,
 * and the codes that lead guests to it.
 *
 * Sits under the publish controls because that is where an owner is already
 * thinking about the menu's public life — the address to share, and now the
 * stickers that carry it to the tables.
 *
 * Each button states its own precondition rather than failing when pressed: a
 * menu with no dishes has nothing to print, and stickers need a published menu
 * because a QR code has to lead somewhere. Saying so up front is cheaper for
 * the owner than a dialog that refuses.
 */
export function PrintDownloads({
  locale,
  menuId,
  menuName,
  status,
  hasDishes,
  plan,
}: PrintDownloadsProps) {
  const t = useTranslations("Print");
  const [openDialog, setOpenDialog] = useState<PrintKind | null>(null);

  const published = status === "published";
  const entitled = canRemoveBranding(plan);

  return (
    <section
      aria-labelledby="print-downloads-heading"
      className="border-border bg-card flex flex-col gap-3 rounded-lg border p-4"
    >
      <h2 id="print-downloads-heading" className="font-medium">
        {t("dialogTitle.menu")}
      </h2>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex flex-col gap-1">
          <Button
            type="button"
            variant="outline"
            disabled={!hasDishes}
            aria-describedby={hasDishes ? undefined : "print-menu-hint"}
            onClick={() => setOpenDialog("menu")}
          >
            <FileText aria-hidden="true" />
            {t("downloadMenu")}
          </Button>
          {hasDishes ? null : (
            <p id="print-menu-hint" className="text-muted-foreground text-sm">
              {t("menuNeedsDishes")}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <Button
            type="button"
            variant="outline"
            disabled={!published}
            aria-describedby={published ? undefined : "print-stickers-hint"}
            onClick={() => setOpenDialog("stickers")}
          >
            <QrCode aria-hidden="true" />
            {t("downloadStickers")}
          </Button>
          {published ? null : (
            <p id="print-stickers-hint" className="text-muted-foreground text-sm">
              {t("stickersNeedPublish")}
            </p>
          )}
        </div>
      </div>

      {/*
        No Toaster here: the workspace layout already mounts the dashboard's
        one, and a second would render every success twice.
      */}
      <PrintDownloadDialog
        kind="menu"
        locale={locale}
        menuId={menuId}
        menuName={menuName}
        canRemoveBranding={entitled}
        open={openDialog === "menu"}
        onOpenChange={(open) => setOpenDialog(open ? "menu" : null)}
      />

      <PrintDownloadDialog
        kind="stickers"
        locale={locale}
        menuId={menuId}
        menuName={menuName}
        canRemoveBranding={entitled}
        open={openDialog === "stickers"}
        onOpenChange={(open) => setOpenDialog(open ? "stickers" : null)}
      />
    </section>
  );
}

"use client";

import { Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Lets a guest hand the menu link to someone else, or grab it for their own
 * phone — a table QR code often gets one scan per group.
 *
 * `navigator.clipboard.writeText` can genuinely reject (no permission,
 * insecure context, an iframe without the clipboard-write policy), so success
 * is never assumed: the toast reports whichever actually happened.
 */
export interface ShareMenuProps {
  url: string;
  qr?: ReactNode;
  className?: string;
}

export function ShareMenu({ url, qr, className }: ShareMenuProps) {
  const t = useTranslations("Menu");

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("copied"));
    } catch {
      toast.error(t("copyFailed"));
    }
  };

  return (
    <div
      data-slot="share-menu"
      role="group"
      aria-label={t("share")}
      className={cn("flex flex-col gap-3", className)}
    >
      <Button type="button" onClick={() => void copyLink()}>
        <Share2 aria-hidden="true" />
        {t("copyLink")}
      </Button>

      {qr ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4">
          {qr}
          <p className="text-sm text-muted-foreground">{t("scanToOpen")}</p>
        </div>
      ) : null}
    </div>
  );
}

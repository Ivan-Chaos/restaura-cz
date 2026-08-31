"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { IDLE, type FormState } from "@/lib/api/form-state";
import type { MenuStatus } from "@/lib/api/types";

export interface PublishControlsProps {
  status: MenuStatus;
  /** Absolute, locale-prefixed address to share. Null before the first publish. */
  publicUrl: string | null;
  locale: string;
  menuId: string;
  publishAction: (state: FormState, formData: FormData) => Promise<FormState>;
  unpublishAction: (state: FormState, formData: FormData) => Promise<FormState>;
}

/**
 * The publish gate.
 *
 * Until an owner presses Publish the menu has no public address at all, so this
 * is where the difference between "mine" and "the world's" is made visible: the
 * status, the button that changes it, and — once published — the exact link to
 * share.
 */
export function PublishControls({
  status,
  publicUrl,
  locale,
  menuId,
  publishAction,
  unpublishAction,
}: PublishControlsProps) {
  const t = useTranslations("Publish");
  const tErrors = useTranslations("Auth.errors");
  const isPublished = status === "published";
  const [state, formAction, pending] = useActionState(
    isPublished ? unpublishAction : publishAction,
    IDLE,
  );
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle");

  async function copyLink() {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied("done");
    } catch {
      // Clipboard access is refused in some browsers and every insecure
      // context; the address is on screen, so this is a nuisance, not a dead end.
      setCopied("failed");
    }
  }

  return (
    <section className="border-border bg-card flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant={isPublished ? "default" : "secondary"}>
            {isPublished ? t("published") : t("draft")}
          </Badge>
          <p className="font-medium">{isPublished ? t("publishedTitle") : t("draftTitle")}</p>
        </div>

        <form action={formAction}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="menuId" value={menuId} />
          <Button type="submit" variant={isPublished ? "outline" : "default"} disabled={pending}>
            {pending ? t("working") : isPublished ? t("unpublish") : t("publish")}
          </Button>
        </form>
      </div>

      <p className="text-muted-foreground text-sm">
        {isPublished ? t("publishedDescription") : t("draftDescription")}
      </p>

      {isPublished && publicUrl ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">{t("addressLabel")}</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="bg-muted min-w-0 flex-1 truncate rounded px-2 py-1 text-sm">
              {publicUrl}
            </code>
            <Button type="button" variant="outline" size="sm" onClick={copyLink}>
              {copied === "done" ? t("copied") : copied === "failed" ? t("copyFailed") : t("copy")}
            </Button>
            {/*
              A real anchor with button styling. Base UI's Button expects a
              native <button>; given an anchor it replaces the link semantics
              with button ones, which breaks opening in a new tab.
            */}
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              {t("view")}
            </a>
          </div>
        </div>
      ) : null}

      {state.status === "error" ? (
        <p role="alert" className="text-destructive text-sm">
          {tErrors(state.code)}
        </p>
      ) : null}
    </section>
  );
}

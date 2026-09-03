"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { Button, buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { IDLE, type FormState } from "@/lib/api/form-state";
import type { VisualVariantId } from "@/lib/menu-display/variants";

export interface PreviewBarProps {
  locale: string;
  menuId: string;
  variantId: VisualVariantId;
  /** Localised style name, resolved by the page. */
  styleName: string;
  /** True when the previewed style is already the saved one. */
  isCurrent: boolean;
  /** Injected so stories never bundle a Server Action. */
  action: (state: FormState, formData: FormData) => Promise<FormState>;
}

/**
 * The strip above a style preview: which style this is, the way back, and the
 * one button that turns a preview into the saved choice.
 *
 * Deliberately styled with the *previewed* theme's own card tokens, so the bar
 * is proof the tokens hold up on a real control, and deliberately without a
 * toast — this route has no Toaster, so success is said inline.
 */
export function PreviewBar({
  locale,
  menuId,
  variantId,
  styleName,
  isCurrent,
  action,
}: PreviewBarProps) {
  const t = useTranslations("Preview");
  const tErrors = useTranslations("Auth.errors");
  const [state, formAction, pending] = useActionState(action, IDLE);

  return (
    <div
      data-slot="preview-bar"
      role="region"
      aria-label={t("metaTitle")}
      className="bg-card text-card-foreground border-border sticky top-0 z-20 border-b"
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-2 text-sm">
        <p className="min-w-0 font-medium">
          {t("previewing", { style: styleName })}
          {isCurrent ? (
            <span className="text-muted-foreground ml-2 font-normal">· {t("current")}</span>
          ) : null}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/workspace/menus/${menuId}`}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            {t("back")}
          </Link>

          <form action={formAction} className="flex items-center gap-2">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="menuId" value={menuId} />
            <input type="hidden" name="visualVariant" value={variantId} />
            <Button type="submit" size="sm" disabled={pending || isCurrent}>
              {t("useStyle")}
            </Button>
            {state.status === "success" ? (
              <span role="status" className="text-muted-foreground">
                {t("applied")}
              </span>
            ) : null}
            {state.status === "error" ? (
              <span role="alert" className="text-destructive">
                {tErrors(state.code)}
              </span>
            ) : null}
          </form>
        </div>
      </div>
    </div>
  );
}

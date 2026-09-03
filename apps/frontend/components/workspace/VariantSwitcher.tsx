"use client";

import { useActionState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { IDLE, type FormState } from "@/lib/api/form-state";
import { VISUAL_VARIANTS } from "@/lib/menu-display/variants";

import { VariantSwatch } from "./VariantSwatch";

export interface VariantSwitcherProps {
  /** The variant the menu currently has, as stored. Unknown values match nothing. */
  selected: string;
  locale: string;
  menuId: string;
  /** Injected so stories never bundle a Server Action. */
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  /**
   * Locale-relative path the preview route lives under, e.g. `/preview/<menuId>`;
   * the style id is appended. A string, not a function: this is a client
   * component and a Server Component cannot hand it a function. Omitted, no
   * preview links render.
   */
  previewBasePath?: string;
}

/**
 * The visual-style picker.
 *
 * One radio card per catalogue entry, each showing a swatch built from the
 * style's own tokens, its name and a one-line description. Choosing a card
 * submits the form straight away, so the control feels like a switch; the
 * visible "Apply" button is what makes it work before hydration and for anyone
 * who would rather confirm than have a click commit.
 *
 * Plain `useActionState` rather than `useActionForm`: a radio group has no
 * typed input to preserve across a rejection, and the values are the
 * catalogue, not the owner's words. The action still calls `readVisualVariant`
 * first, so an id outside the catalogue never reaches the API.
 */
export function VariantSwitcher({
  selected,
  locale,
  menuId,
  action,
  previewBasePath,
}: VariantSwitcherProps) {
  const t = useTranslations("MenuEditor");
  const tVariants = useTranslations("VisualVariants");
  const tErrors = useTranslations("Auth.errors");

  const [state, formAction, pending] = useActionState(action, IDLE);

  // Announce on the falling edge of `pending`, never on state identity: a
  // stubbed action in a story can hand back the same object twice and it is
  // still two saves.
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending && state.status === "success") {
      toast.success(t("variantSaved"));
    }
    wasPending.current = pending;
  }, [pending, state, t]);

  return (
    <form action={formAction}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="menuId" value={menuId} />

      <fieldset className="border-border bg-card rounded-lg border p-4">
        <legend className="px-1 text-sm font-medium">{t("variantTitle")}</legend>
        <p className="text-muted-foreground mb-3 text-sm">{t("variantDescription")}</p>

        <div className="grid gap-2 sm:grid-cols-2">
          {VISUAL_VARIANTS.map(({ id, themeId }) => (
            <div key={id} className="flex flex-col gap-1">
              <label
                className="border-border bg-background has-checked:border-primary has-checked:ring-primary/30 has-focus-visible:ring-ring/50 flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm has-checked:ring-2 has-focus-visible:ring-2"
                data-variant={id}
              >
                <input
                  type="radio"
                  name="visualVariant"
                  value={id}
                  defaultChecked={selected === id}
                  disabled={pending}
                  onChange={(event) => event.currentTarget.form?.requestSubmit()}
                  className="accent-primary size-4 shrink-0"
                />
                <VariantSwatch themeId={themeId} />
                <span className="flex min-w-0 flex-col">
                  <span className="font-medium">{tVariants(`${id}.name`)}</span>
                  <span className="text-muted-foreground text-xs leading-snug">
                    {tVariants(`${id}.description`)}
                  </span>
                </span>
              </label>
              {previewBasePath ? (
                <Link
                  href={`${previewBasePath}/${id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground w-fit px-1 text-xs underline underline-offset-4"
                >
                  {t("variantPreview")}: {tVariants(`${id}.name`)}
                </Link>
              ) : null}
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button type="submit" variant="outline" size="sm" disabled={pending}>
            {pending ? t("saving") : t("variantApply")}
          </Button>
          {state.status === "error" ? (
            <p role="alert" className="text-destructive text-sm">
              {tErrors(state.code)}
            </p>
          ) : null}
        </div>
      </fieldset>
    </form>
  );
}

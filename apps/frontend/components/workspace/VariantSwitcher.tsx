import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";

export interface VariantSwitcherProps {
  /** The variant the menu currently has. Only "default" exists so far. */
  selected: string;
}

/**
 * The visual-style picker, deliberately showing only one style.
 *
 * The control is here now, and the selection is already stored on the menu, so
 * shipping a real second style is an entry in the API's allowlist plus theme
 * work — not a data migration and not a new place in the UI. The unavailable
 * options are rendered as disabled radios rather than hidden, so the owner can
 * see that more styles are coming.
 */
const PLANNED_VARIANT_COUNT = 2;

export function VariantSwitcher({ selected }: VariantSwitcherProps) {
  const t = useTranslations("MenuEditor");

  return (
    <fieldset className="border-border bg-card rounded-lg border p-4">
      <legend className="px-1 text-sm font-medium">{t("variantTitle")}</legend>
      <p className="text-muted-foreground mb-3 text-sm">{t("variantDescription")}</p>

      <div className="flex flex-wrap gap-2">
        <label className="border-border bg-background has-checked:border-primary flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
          <input
            type="radio"
            name="visualVariant"
            value="default"
            defaultChecked={selected === "default"}
            readOnly
          />
          {t("variantDefault")}
        </label>

        {Array.from({ length: PLANNED_VARIANT_COUNT }, (_unused, index) => (
          <label
            key={index}
            className="border-border text-muted-foreground flex cursor-not-allowed items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm opacity-60"
          >
            <input type="radio" name="visualVariant" disabled />
            <Badge variant="secondary">{t("variantComingSoon")}</Badge>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

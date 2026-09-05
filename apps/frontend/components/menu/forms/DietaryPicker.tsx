"use client";

import { useId, type ReactNode } from "react";
import { useTranslations } from "next-intl";

import {
  ALLERGENS,
  DIET_MARKER_IDS,
  DISH_WARNING_LIST,
  DIETARY_MARKERS,
  OBSERVANCE_MARKER_IDS,
  type AllergenNumber,
  type ApiDietaryId,
  type DishWarningId,
} from "@/lib/design-system/dietary";
import { cn } from "@/lib/utils";
import {
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";

/**
 * One chip: a visually-hidden checkbox and the label that stands in for it.
 *
 * Declared at module scope, not inside `DietaryPicker`. A component defined in
 * a render body is a *new type* on every render, so React unmounts and remounts
 * it rather than updating it — which throws away focus. Ticking one box with the
 * keyboard would move focus to the document, and the next key press would go
 * nowhere. The nesting is invisible in a click-through and obvious the moment
 * anyone uses the keyboard.
 *
 * The checkbox is `sr-only` rather than `hidden`, because it still has to be
 * focusable — `has-[:focus-visible]:` on the label is what draws the ring, so
 * keyboard operation costs nothing extra. The label is deliberately not given
 * `htmlFor`: it already wraps the input, and doing both activates it twice.
 */
function Chip({
  id,
  name,
  value,
  checked,
  disabled,
  onCheckedChange,
  children,
  small = false,
}: {
  id: string;
  name: string;
  value: string;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
  children: ReactNode;
  small?: boolean;
}) {
  return (
    <label
      className={cn(
        "border-input bg-background text-foreground inline-flex cursor-pointer items-center gap-1.5 rounded-4xl border font-medium transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        small ? "h-8 px-2.5 text-xs" : "h-9 px-3 text-sm",
        "has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:checked]:border-primary",
        "has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-offset-2",
        "has-[:disabled]:pointer-events-none has-[:disabled]:opacity-50",
        "[&>svg]:size-3.5",
      )}
    >
      <input
        id={id}
        type="checkbox"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onCheckedChange(event.target.checked)}
        className="sr-only"
      />
      {children}
    </label>
  );
}

export interface DietaryPickerProps {
  value: ApiDietaryId[];
  allergens: AllergenNumber[];
  warnings: DishWarningId[];
  onChange: (next: {
    dietary: ApiDietaryId[];
    allergens: AllergenNumber[];
    warnings: DishWarningId[];
  }) => void;
  /** Unique within the page, so every checkbox gets its own id. */
  idPrefix: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Staff-facing editor for the three vocabularies guests read on a dish: dietary
 * markers (opt-in claims like "vegan"), the 14 EU allergen numbers (mandatory
 * declarations), and warnings (facts a guest may need to act on).
 *
 * They live in one control because editing them together is the real task — a
 * server ticking "vegan" without also clearing "milk" is exactly the mistake
 * this UI exists to make harder — but in labelled groups, because ticking a
 * religious observance is a different kind of decision from ticking a diet, and
 * a flat wall of chips invites skimming.
 *
 * **Every chip is a real `<input type="checkbox">`.** It used to be a `Toggle`,
 * which renders a `<button aria-pressed>` and posts nothing at all: with client
 * JavaScript unavailable an owner could not have declared a single allergen,
 * and allergens are the one thing on a Czech menu that is not optional. A
 * checkbox posts its value or nothing, so a group of them *is* the array the
 * Server Action reads back with `getAll` — the same shape the phone list uses.
 * The visible chip is the label wrapping it, and `has-[:checked]:` styles it,
 * so even how it looks costs no JavaScript.
 */
export function DietaryPicker({
  value,
  allergens,
  warnings,
  onChange,
  idPrefix,
  disabled = false,
  className,
}: DietaryPickerProps) {
  const t = useTranslations("Forms");
  const tMarkers = useTranslations("DietaryMarkers");
  const tWarnings = useTranslations("DishWarnings");
  const tAllergens = useTranslations("Allergens");
  const dietHeadingId = useId();
  const observanceHeadingId = useId();
  const warningsHeadingId = useId();
  const allergensHeadingId = useId();

  function toggleMarker(id: ApiDietaryId, checked: boolean) {
    onChange({
      dietary: checked ? [...value, id] : value.filter((existing) => existing !== id),
      allergens,
      warnings,
    });
  }

  function toggleAllergen(number: AllergenNumber, checked: boolean) {
    onChange({
      dietary: value,
      allergens: checked
        ? [...allergens, number]
        : allergens.filter((existing) => existing !== number),
      warnings,
    });
  }

  function toggleWarning(id: DishWarningId, checked: boolean) {
    onChange({
      dietary: value,
      allergens,
      warnings: checked ? [...warnings, id] : warnings.filter((existing) => existing !== id),
    });
  }

  function markerGroup(
    ids: readonly ApiDietaryId[],
    headingId: string,
    heading: string,
  ) {
    return (
      <div>
        <FieldTitle id={headingId}>{heading}</FieldTitle>
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-labelledby={headingId}>
          {ids.map((id) => {
            const marker = DIETARY_MARKERS[id];
            const Icon = marker.icon;
            return (
              <Chip
                key={id}
                id={`${idPrefix}-dietary-${id}`}
                name="dietary"
                value={id}
                checked={value.includes(id)}
                disabled={disabled}
                onCheckedChange={(checked) => toggleMarker(id, checked)}
              >
                <Icon aria-hidden="true" />
                {tMarkers(marker.labelKey)}
              </Chip>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <FieldSet data-slot="dietary-picker" className={cn(className)}>
      <FieldLegend>{t("dietary")}</FieldLegend>
      <FieldGroup>
        {markerGroup(DIET_MARKER_IDS, dietHeadingId, t("dietGroup"))}
        {markerGroup(OBSERVANCE_MARKER_IDS, observanceHeadingId, t("observanceGroup"))}

        <div>
          <FieldTitle id={warningsHeadingId}>{tWarnings("title")}</FieldTitle>
          <div
            className="mt-2 flex flex-wrap gap-2"
            role="group"
            aria-labelledby={warningsHeadingId}
          >
            {DISH_WARNING_LIST.map((warning) => {
              const Icon = warning.icon;
              return (
                <Chip
                  key={warning.id}
                  id={`${idPrefix}-warning-${warning.id}`}
                  name="warnings"
                  value={warning.id}
                  checked={warnings.includes(warning.id)}
                  disabled={disabled}
                  onCheckedChange={(checked) => toggleWarning(warning.id, checked)}
                >
                  <Icon aria-hidden="true" />
                  {tWarnings(warning.labelKey)}
                </Chip>
              );
            })}
          </div>
        </div>

        <div>
          {/* FieldTitle (not FieldLegend) — a <legend> is only valid as a direct
              child of <fieldset>, and this heading sits inside a plain <div>
              alongside the numbers grid it labels. */}
          <FieldTitle id={allergensHeadingId}>{tAllergens("title")}</FieldTitle>
          <FieldDescription>{tAllergens("legendHint")}</FieldDescription>
          <div
            className="mt-2 flex flex-wrap gap-2"
            role="group"
            aria-labelledby={allergensHeadingId}
          >
            {ALLERGENS.map((allergen) => (
              <Chip
                key={allergen.number}
                id={`${idPrefix}-allergen-${allergen.number}`}
                name="allergens"
                value={String(allergen.number)}
                checked={allergens.includes(allergen.number)}
                disabled={disabled}
                onCheckedChange={(checked) => toggleAllergen(allergen.number, checked)}
                small
              >
                {/* Visible number + a trailing sr-only name: the accessible
                    name is their concatenation ("1 Cereals containing
                    gluten"), so a screen reader hears the number *and* what
                    it means — a number alone is not an accessible label. */}
                <span className="tabular-nums">{allergen.number}</span>
                <span className="sr-only"> {tAllergens(allergen.labelKey)}</span>
              </Chip>
            ))}
          </div>
        </div>
      </FieldGroup>
    </FieldSet>
  );
}

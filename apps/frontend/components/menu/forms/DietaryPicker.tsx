"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";

import {
  ALLERGENS,
  DIETARY_MARKER_LIST,
  type AllergenNumber,
  type DietaryMarkerId,
} from "@/lib/design-system/dietary";
import { cn } from "@/lib/utils";
import { FieldDescription, FieldGroup, FieldLegend, FieldSet, FieldTitle } from "@/components/ui/field";
import { Toggle } from "@/components/ui/toggle";

export interface DietaryPickerProps {
  value: DietaryMarkerId[];
  allergens: AllergenNumber[];
  onChange: (next: { dietary: DietaryMarkerId[]; allergens: AllergenNumber[] }) => void;
  className?: string;
}

/**
 * Staff-facing editor for the two vocabularies guests read on a dish page:
 * dietary markers (opt-in claims like "vegan") and the 14 EU allergen numbers
 * (mandatory declarations). They live in one control because editing them
 * together is the real task — a server ticking "vegan" without also checking
 * "milk" off is exactly the mistake this UI exists to make harder.
 *
 * Each control is a `Toggle`: a real `<button>` with `aria-pressed`, so no
 * hand-rolled checkbox markup is needed and every state change is keyboard-
 * operable for free.
 */
export function DietaryPicker({ value, allergens, onChange, className }: DietaryPickerProps) {
  const t = useTranslations("Forms");
  const tMarkers = useTranslations("DietaryMarkers");
  const tAllergens = useTranslations("Allergens");
  const allergensHeadingId = useId();

  function toggleMarker(id: DietaryMarkerId, pressed: boolean) {
    onChange({
      dietary: pressed ? [...value, id] : value.filter((existing) => existing !== id),
      allergens,
    });
  }

  function toggleAllergen(number: AllergenNumber, pressed: boolean) {
    onChange({
      dietary: value,
      allergens: pressed
        ? [...allergens, number]
        : allergens.filter((existing) => existing !== number),
    });
  }

  return (
    <FieldSet data-slot="dietary-picker" className={cn(className)}>
      <FieldLegend>{t("dietary")}</FieldLegend>
      <FieldGroup>
        <div className="flex flex-wrap gap-2">
          {DIETARY_MARKER_LIST.map((marker) => {
            const Icon = marker.icon;
            const pressed = value.includes(marker.id);
            return (
              <Toggle
                key={marker.id}
                variant="outline"
                pressed={pressed}
                onPressedChange={(next) => toggleMarker(marker.id, next)}
              >
                <Icon aria-hidden="true" />
                {tMarkers(marker.labelKey)}
              </Toggle>
            );
          })}
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
            {ALLERGENS.map((allergen) => {
              const pressed = allergens.includes(allergen.number);
              return (
                <Toggle
                  key={allergen.number}
                  variant="outline"
                  size="sm"
                  pressed={pressed}
                  onPressedChange={(next) => toggleAllergen(allergen.number, next)}
                >
                  {/* Visible number + a trailing sr-only name: the accessible
                      name is their concatenation ("1 Cereals containing
                      gluten"), so a screen reader hears the number *and* what
                      it means — a number alone is not an accessible label. */}
                  <span>{allergen.number}</span>
                  <span className="sr-only"> {tAllergens(allergen.labelKey)}</span>
                </Toggle>
              );
            })}
          </div>
        </div>
      </FieldGroup>
    </FieldSet>
  );
}

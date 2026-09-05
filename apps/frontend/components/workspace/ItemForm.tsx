"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { DietaryPicker } from "@/components/menu/forms/DietaryPicker";
import { AvailabilityField } from "@/components/workspace/AvailabilityField";
import { ImageField } from "@/components/workspace/ImageField";
import { SpiceLevelField } from "@/components/workspace/SpiceLevelField";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fieldCode, useActionForm, type ServerAction } from "@/hooks/use-action-form";
import type {
  AllergenNumber,
  ApiDietaryId,
  AvailabilityId,
  DishWarningId,
} from "@/lib/design-system/dietary";
import type { ImageModel, SpiceLevel } from "@/lib/design-system/types";
import type { PendingImage } from "@/lib/validation/image";
import { itemFormData } from "@/lib/validation/form-values";
import { menuItemFormSchema, type MenuItemFormValues } from "@/lib/validation/schemas";

export type ItemFormValues = MenuItemFormValues;

export interface ItemFormProps {
  action: ServerAction;
  /** Ids the action needs: locale, menuId, sectionId and, when editing, itemId. */
  hidden: Record<string, string>;
  /**
   * What the row already holds. The declaration groups are typed in their own
   * vocabularies rather than as the form’s strings, because that is how the
   * editor row has them and converting twice invites one of the conversions to
   * be wrong.
   */
  defaults?: Partial<Omit<ItemFormValues, "dietary" | "allergens" | "warnings" | "spiceLevel" | "availability">> & {
    dietary?: ApiDietaryId[];
    allergens?: AllergenNumber[];
    warnings?: DishWarningId[];
    spiceLevel?: SpiceLevel;
    availability?: AvailabilityId;
  };
  submitLabel: string;
  /** Rendered beside submit when editing, to leave the row alone. */
  onCancel?: () => void;
  /** Called once the save has come back clean, so an editing row can close. */
  onSuccess?: () => void;
  /** Announced once the save lands, so a quiet success is not a silent one. */
  successMessage?: string;
  /** Unique within the page, so labels and errors point at the right inputs. */
  idPrefix: string;
  /** The dish's stored photograph, when editing one that has it. */
  currentImage?: ImageModel | null;
}

/**
 * Adding a dish and editing one take the same fields, so they share a form. The
 * only difference is whether an itemId is present in `hidden`.
 *
 * Validated by react-hook-form against the same schema the Server Action
 * re-reads, which is what makes a rejected submit keep what was typed: the
 * values live in the form, not in the DOM that React resets once an action
 * completes.
 */
export function ItemForm({
  action,
  hidden,
  defaults,
  submitLabel,
  onCancel,
  onSuccess,
  successMessage,
  idPrefix,
  currentImage = null,
}: ItemFormProps) {
  const t = useTranslations("MenuEditor");
  const tErrors = useTranslations("Auth.errors");
  const tFields = useTranslations("MenuEditor.fieldErrors");

  const isEditing = hidden.itemId !== undefined;

  /**
   * What should happen to the photograph when this dish is saved.
   *
   * Held here rather than uploaded on the spot, which is what makes cancelling
   * free: a file chosen and then abandoned was never sent, so there is no
   * orphaned object in storage to clean up afterwards.
   */
  const [image, setImage] = useState<PendingImage>({ kind: "keep" });

  /**
   * What the dish declares.
   *
   * Held here rather than registered with react-hook-form because these are
   * checkbox and radio *groups*: the DOM already holds the answer under a
   * repeated name, and RHF's value would be a second copy of it with its own
   * chance to disagree. `toFormData` reads this state, the browser posts the
   * same inputs when JavaScript never loads, and `readItem` parses both.
   */
  const [declarations, setDeclarations] = useState({
    dietary: (defaults?.dietary ?? []) as ApiDietaryId[],
    allergens: (defaults?.allergens ?? []) as AllergenNumber[],
    warnings: (defaults?.warnings ?? []) as DishWarningId[],
  });
  const [spiceLevel, setSpiceLevel] = useState<SpiceLevel>(defaults?.spiceLevel ?? 0);
  const [availability, setAvailability] = useState<AvailabilityId>(
    defaults?.availability ?? "available",
  );

  const { form, formAction, onSubmit, pending, state, summary } = useActionForm<ItemFormValues>({
    action,
    schema: menuItemFormSchema,
    defaultValues: {
      name: defaults?.name ?? "",
      description: defaults?.description ?? "",
      priceCzk: defaults?.priceCzk ?? "",
      dietary: [],
      allergens: [],
      warnings: [],
      spiceLevel: "0",
      availability: "available",
    },
    toFormData: (values) =>
      itemFormData(
        {
          ...values,
          dietary: declarations.dietary,
          allergens: declarations.allergens.map(String),
          warnings: declarations.warnings,
          spiceLevel: String(spiceLevel),
          availability,
        },
        hidden,
        image,
      ),
    onSuccess: (saved) => {
      if (successMessage) toast.success(successMessage);
      // The photograph is stored now, so the field goes back to resting state
      // and stops offering to upload what it already uploaded.
      setImage({ kind: "keep" });
      // Adding: an empty form, ready for the next dish. Editing: the row is
      // about to close, so clearing it would only be a flicker.
      if (!isEditing) {
        saved.reset();
        // The declaration groups live outside react-hook-form, so `reset` does
        // not reach them — the next dish would inherit the last one's allergens.
        setDeclarations({ dietary: [], allergens: [], warnings: [] });
        setSpiceLevel(0);
        setAvailability("available");
      }
      onSuccess?.();
    },
  });

  const { errors } = form.formState;
  const nameError = fieldCode(errors.name?.message);
  const descriptionError = fieldCode(errors.description?.message);
  const priceError = fieldCode(errors.priceCzk?.message);
  // The file never passes through the zod schema — it is not a typed value — so
  // its rejection arrives on the action's own field map instead.
  const imageError = state.status === "error" ? state.fields?.image : undefined;

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      <FieldGroup className="gap-3">
        <Field data-invalid={nameError ? true : undefined}>
          <FieldLabel htmlFor={`${idPrefix}-name`}>{t("itemName")}</FieldLabel>
          <Input
            id={`${idPrefix}-name`}
            defaultValue={defaults?.name}
            placeholder={t("itemNamePlaceholder")}
            aria-invalid={nameError ? true : undefined}
            aria-describedby={nameError ? `${idPrefix}-name-error` : undefined}
            {...form.register("name")}
          />
          {nameError ? (
            <FieldError id={`${idPrefix}-name-error`}>{tFields(nameError)}</FieldError>
          ) : null}
        </Field>

        <Field data-invalid={descriptionError ? true : undefined}>
          <FieldLabel htmlFor={`${idPrefix}-description`}>{t("itemDescription")}</FieldLabel>
          <Textarea
            id={`${idPrefix}-description`}
            rows={2}
            defaultValue={defaults?.description}
            placeholder={t("itemDescriptionPlaceholder")}
            aria-invalid={descriptionError ? true : undefined}
            aria-describedby={
              descriptionError ? `${idPrefix}-description-error` : undefined
            }
            {...form.register("description")}
          />
          {descriptionError ? (
            <FieldError id={`${idPrefix}-description-error`}>
              {tFields(descriptionError)}
            </FieldError>
          ) : null}
        </Field>

        <ImageField
          kind="dish"
          current={currentImage}
          label={t("itemPhoto")}
          previewAlt={defaults?.name ?? t("itemPhoto")}
          idPrefix={`${idPrefix}-image`}
          error={imageError}
          disabled={pending}
          onChange={setImage}
        />

        <DietaryPicker
          idPrefix={idPrefix}
          value={declarations.dietary}
          allergens={declarations.allergens}
          warnings={declarations.warnings}
          disabled={pending}
          onChange={setDeclarations}
        />

        <SpiceLevelField
          idPrefix={idPrefix}
          value={spiceLevel}
          disabled={pending}
          onChange={setSpiceLevel}
        />

        <AvailabilityField
          idPrefix={idPrefix}
          value={availability}
          disabled={pending}
          onChange={setAvailability}
        />

        <Field data-invalid={priceError ? true : undefined}>
          <FieldLabel htmlFor={`${idPrefix}-price`}>{t("itemPrice")}</FieldLabel>
          <div className="flex items-center gap-2">
            <Input
              id={`${idPrefix}-price`}
              // `inputMode` gets a numeric keypad with a decimal separator on
              // phones; the field stays a text input so a typo is preserved and
              // explained rather than silently discarded by the browser.
              inputMode="decimal"
              defaultValue={defaults?.priceCzk}
              placeholder={t("pricePlaceholder")}
              className="max-w-32"
              aria-invalid={priceError ? true : undefined}
              aria-describedby={
                priceError ? `${idPrefix}-price-error` : `${idPrefix}-price-hint`
              }
              {...form.register("priceCzk")}
            />
            <span className="text-muted-foreground text-sm">{t("priceSuffix")}</span>
          </div>
          {priceError ? (
            <FieldError id={`${idPrefix}-price-error`}>{tFields(priceError)}</FieldError>
          ) : (
            <FieldDescription id={`${idPrefix}-price-hint`}>{t("priceHint")}</FieldDescription>
          )}
        </Field>
      </FieldGroup>

      {summary ? <FieldError>{tErrors(summary)}</FieldError> : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? t("saving") : submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("cancel")}
          </Button>
        ) : null}
      </div>
    </form>
  );
}

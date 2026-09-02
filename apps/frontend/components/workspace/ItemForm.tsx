"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";

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
import { itemFormData } from "@/lib/validation/form-values";
import { menuItemFormSchema, type MenuItemFormValues } from "@/lib/validation/schemas";

export type ItemFormValues = MenuItemFormValues;

export interface ItemFormProps {
  action: ServerAction;
  /** Ids the action needs: locale, menuId, sectionId and, when editing, itemId. */
  hidden: Record<string, string>;
  defaults?: Partial<ItemFormValues>;
  submitLabel: string;
  /** Rendered beside submit when editing, to leave the row alone. */
  onCancel?: () => void;
  /** Called once the save has come back clean, so an editing row can close. */
  onSuccess?: () => void;
  /** Announced once the save lands, so a quiet success is not a silent one. */
  successMessage?: string;
  /** Unique within the page, so labels and errors point at the right inputs. */
  idPrefix: string;
}

/**
 * Adding a dish and editing one take the same three fields, so they share a
 * form. The only difference is whether an itemId is present in `hidden`.
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
}: ItemFormProps) {
  const t = useTranslations("MenuEditor");
  const tErrors = useTranslations("Auth.errors");
  const tFields = useTranslations("MenuEditor.fieldErrors");

  const isEditing = hidden.itemId !== undefined;

  const { form, formAction, onSubmit, pending, summary } = useActionForm<ItemFormValues>({
    action,
    schema: menuItemFormSchema,
    defaultValues: {
      name: defaults?.name ?? "",
      description: defaults?.description ?? "",
      priceCzk: defaults?.priceCzk ?? "",
    },
    toFormData: (values) => itemFormData(values, hidden),
    onSuccess: (saved) => {
      if (successMessage) toast.success(successMessage);
      // Adding: an empty form, ready for the next dish. Editing: the row is
      // about to close, so clearing it would only be a flicker.
      if (!isEditing) saved.reset();
      onSuccess?.();
    },
  });

  const { errors } = form.formState;
  const nameError = fieldCode(errors.name?.message);
  const descriptionError = fieldCode(errors.description?.message);
  const priceError = fieldCode(errors.priceCzk?.message);

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

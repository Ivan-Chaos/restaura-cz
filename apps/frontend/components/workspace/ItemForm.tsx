"use client";

import { useActionState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { IDLE, type FormState } from "@/lib/api/form-state";

export interface ItemFormValues {
  name: string;
  description: string;
  /** Kept as a string so a half-typed price survives a failed submit. */
  priceCzk: string;
}

export interface ItemFormProps {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  /** Ids the action needs: locale, menuId, sectionId and, when editing, itemId. */
  hidden: Record<string, string>;
  defaults?: Partial<ItemFormValues>;
  submitLabel: string;
  /** Rendered beside submit when editing, to leave the row alone. */
  onCancel?: () => void;
  /** Called once the save has come back clean, so an editing row can close. */
  onSuccess?: () => void;
  /** Unique within the page, so labels and errors point at the right inputs. */
  idPrefix: string;
}

/**
 * Adding a dish and editing one take the same three fields, so they share a
 * form. The only difference is whether an itemId is present in `hidden`.
 */
export function ItemForm({
  action,
  hidden,
  defaults,
  submitLabel,
  onCancel,
  onSuccess,
  idPrefix,
}: ItemFormProps) {
  const t = useTranslations("MenuEditor");
  const tErrors = useTranslations("Auth.errors");
  const tFields = useTranslations("MenuEditor.fieldErrors");
  const [state, formAction, pending] = useActionState(action, IDLE);

  // The initial state is also "idle", so a submission has to have happened
  // before this counts as a success — hence tracking the pending edge rather
  // than watching the state alone.
  const submitted = useRef(false);
  useEffect(() => {
    if (pending) {
      submitted.current = true;
      return;
    }
    if (submitted.current && state.status === "idle") {
      submitted.current = false;
      onSuccess?.();
    }
  }, [pending, state, onSuccess]);

  const fields = state.status === "error" ? state.fields : undefined;
  const summary = state.status === "error" && !fields ? state.code : undefined;

  return (
    <form action={formAction} noValidate className="flex flex-col gap-3">
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      <FieldGroup className="gap-3">
        <Field data-invalid={fields?.name ? true : undefined}>
          <FieldLabel htmlFor={`${idPrefix}-name`}>{t("itemName")}</FieldLabel>
          <Input
            id={`${idPrefix}-name`}
            name="name"
            defaultValue={defaults?.name}
            placeholder={t("itemNamePlaceholder")}
            required
            aria-invalid={fields?.name ? true : undefined}
            aria-describedby={fields?.name ? `${idPrefix}-name-error` : undefined}
          />
          {fields?.name ? (
            <FieldError id={`${idPrefix}-name-error`}>{tFields(fields.name)}</FieldError>
          ) : null}
        </Field>

        <Field data-invalid={fields?.description ? true : undefined}>
          <FieldLabel htmlFor={`${idPrefix}-description`}>{t("itemDescription")}</FieldLabel>
          <Textarea
            id={`${idPrefix}-description`}
            name="description"
            rows={2}
            defaultValue={defaults?.description}
            placeholder={t("itemDescriptionPlaceholder")}
            aria-invalid={fields?.description ? true : undefined}
            aria-describedby={
              fields?.description ? `${idPrefix}-description-error` : undefined
            }
          />
          {fields?.description ? (
            <FieldError id={`${idPrefix}-description-error`}>
              {tFields(fields.description)}
            </FieldError>
          ) : null}
        </Field>

        <Field data-invalid={fields?.priceCzk ? true : undefined}>
          <FieldLabel htmlFor={`${idPrefix}-price`}>{t("itemPrice")}</FieldLabel>
          <div className="flex items-center gap-2">
            <Input
              id={`${idPrefix}-price`}
              name="priceCzk"
              // `inputMode` gets a numeric keypad on phones; the field stays a
              // text input so a typo is preserved and explained rather than
              // silently discarded by the browser.
              inputMode="numeric"
              defaultValue={defaults?.priceCzk}
              placeholder={t("pricePlaceholder")}
              required
              className="max-w-32"
              aria-invalid={fields?.priceCzk ? true : undefined}
              aria-describedby={fields?.priceCzk ? `${idPrefix}-price-error` : undefined}
            />
            <span className="text-muted-foreground text-sm">{t("priceSuffix")}</span>
          </div>
          {fields?.priceCzk ? (
            <FieldError id={`${idPrefix}-price-error`}>{tFields(fields.priceCzk)}</FieldError>
          ) : null}
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

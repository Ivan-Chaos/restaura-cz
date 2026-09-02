"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { fieldCode, useActionForm, type ServerAction } from "@/hooks/use-action-form";
import { inlineTextFormData } from "@/lib/validation/form-values";
import { inlineTextSchema, type InlineTextField } from "@/lib/validation/schemas";

export interface InlineTextFormProps {
  /** Injected so stories and tests never bundle a Server Action. */
  action: ServerAction;
  /** Form field name the action reads: "name" for a menu, "title" for a section. */
  field: InlineTextField;
  label: string;
  submitLabel: string;
  pendingLabel: string;
  defaultValue?: string;
  placeholder?: string;
  /** Ids the action needs: locale, menuId, sectionId. */
  hidden: Record<string, string>;
  /** Visually hides the label while leaving it for screen readers. */
  labelHidden?: boolean;
  /** Empties the field once the write lands — adding, as opposed to renaming. */
  resetOnSuccess?: boolean;
  /** Rendered beside submit, for a form that opened over something else. */
  onCancel?: () => void;
  onSuccess?: () => void;
  /** Announced once the write lands, naming what was saved. */
  successMessage?: string;
  className?: string;
}

/**
 * One text field and a save button.
 *
 * Creating a menu, renaming a menu, adding a section and renaming one are the
 * same interaction with different words, so they are one component rather than
 * four that would drift apart.
 *
 * The field registers under the caller's `field` name rather than a fixed
 * internal one, because three things have to agree on it: react-hook-form finds
 * an input by its DOM `name`, the browser posts that name when JavaScript never
 * loads, and the Server Action reads it.
 */
export function InlineTextForm({
  action,
  field,
  label,
  submitLabel,
  pendingLabel,
  defaultValue,
  placeholder,
  hidden,
  labelHidden = false,
  resetOnSuccess = false,
  onCancel,
  onSuccess,
  successMessage,
  className,
}: InlineTextFormProps) {
  const t = useTranslations("MenuEditor");
  const tErrors = useTranslations("Auth.errors");
  const tFields = useTranslations("MenuEditor.fieldErrors");

  const schema = useMemo(() => inlineTextSchema(field), [field]);

  const { form, formAction, onSubmit, pending, summary } = useActionForm<
    Record<string, string>
  >({
    action,
    schema,
    defaultValues: { [field]: defaultValue ?? "" },
    toFormData: (values) => inlineTextFormData(field, values, hidden),
    onSuccess: (saved) => {
      if (successMessage) toast.success(successMessage);
      if (resetOnSuccess) saved.reset({ [field]: "" });
      onSuccess?.();
    },
  });

  const fieldError = fieldCode(form.formState.errors[field]?.message);
  const errorId = `${field}-${hidden.sectionId ?? hidden.menuId ?? "new"}-error`;
  const inputId = errorId.replace("-error", "-input");

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className={className}>
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      <Field data-invalid={fieldError ? true : undefined}>
        <FieldLabel htmlFor={inputId} className={labelHidden ? "sr-only" : undefined}>
          {label}
        </FieldLabel>
        <div className="flex flex-wrap items-start gap-2">
          <Input
            id={inputId}
            // Kept alongside `register`, which sets the value through a ref and
            // leaves the attribute alone: a rendered `value` attribute is how
            // the server-rendered markup shows the current title before
            // hydration.
            defaultValue={defaultValue}
            placeholder={placeholder}
            className="min-w-40 flex-1"
            aria-invalid={fieldError ? true : undefined}
            aria-describedby={fieldError ? errorId : undefined}
            {...form.register(field)}
          />
          <Button type="submit" disabled={pending}>
            {pending ? pendingLabel : submitLabel}
          </Button>
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel}>
              {t("cancel")}
            </Button>
          ) : null}
        </div>
        {fieldError ? <FieldError id={errorId}>{tFields(fieldError)}</FieldError> : null}
        {summary ? <FieldError>{tErrors(summary)}</FieldError> : null}
      </Field>
    </form>
  );
}

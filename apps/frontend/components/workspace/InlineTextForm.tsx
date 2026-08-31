"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { IDLE, type FormState } from "@/lib/api/form-state";

export interface InlineTextFormProps {
  /** Injected so stories and tests never bundle a Server Action. */
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  /** Form field name the action reads, e.g. "name" or "title". */
  field: string;
  label: string;
  submitLabel: string;
  pendingLabel: string;
  defaultValue?: string;
  placeholder?: string;
  /** Ids the action needs: locale, menuId, sectionId. */
  hidden: Record<string, string>;
  /** Visually hides the label while leaving it for screen readers. */
  labelHidden?: boolean;
  className?: string;
}

/**
 * One text field and a save button.
 *
 * Creating a menu, renaming a menu and renaming a section are the same
 * interaction with different words, so they are one component rather than three
 * that would drift apart.
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
  className,
}: InlineTextFormProps) {
  const tErrors = useTranslations("Auth.errors");
  const tFields = useTranslations("MenuEditor.fieldErrors");
  const [state, formAction, pending] = useActionState(action, IDLE);

  const fieldError = state.status === "error" ? state.fields?.[field] : undefined;
  const summary = state.status === "error" && !state.fields ? state.code : undefined;
  const errorId = `${field}-${hidden.sectionId ?? hidden.menuId ?? "new"}-error`;

  return (
    <form action={formAction} noValidate className={className}>
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      <Field data-invalid={fieldError ? true : undefined}>
        <FieldLabel htmlFor={errorId.replace("-error", "-input")} className={labelHidden ? "sr-only" : undefined}>
          {label}
        </FieldLabel>
        <div className="flex flex-wrap items-start gap-2">
          <Input
            id={errorId.replace("-error", "-input")}
            name={field}
            defaultValue={defaultValue}
            placeholder={placeholder}
            required
            className="min-w-40 flex-1"
            aria-invalid={fieldError ? true : undefined}
            aria-describedby={fieldError ? errorId : undefined}
          />
          <Button type="submit" disabled={pending}>
            {pending ? pendingLabel : submitLabel}
          </Button>
        </div>
        {fieldError ? <FieldError id={errorId}>{tFields(fieldError)}</FieldError> : null}
        {summary ? <FieldError>{tErrors(summary)}</FieldError> : null}
      </Field>
    </form>
  );
}

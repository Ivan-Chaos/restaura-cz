"use client";

import { useId } from "react";
import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Controller, useFieldArray, useFormContext } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldTitle } from "@/components/ui/field";
import { fieldCode } from "@/hooks/use-action-form";
import { MAX_PHONES } from "@/lib/api/phone";
import type { FieldErrorCode } from "@/lib/api/types";
import type { ProfileFormValues } from "@/lib/validation/schemas";

import { PhoneInput } from "./PhoneInput";

/** Which message explains a list-level failure. */
function listErrorKey(code: FieldErrorCode | "INVALID"): "phonesMin" | "phonesMax" | "phone" {
  if (code === "ARRAY_MAX_SIZE") return "phonesMax";
  if (code === "IS_PHONE") return "phone";
  return "phonesMin";
}

/**
 * One to three phone numbers, in the owner's own order.
 *
 * Rows are managed by `useFieldArray`, which is the reason this form uses
 * react-hook-form at all: removing the middle row has to drop that row's value
 * and renumber the rest, and hand-rolled keyed state got that right only as
 * long as nobody touched it.
 *
 * Each row is a `Controller` because `PhoneInput` is a controlled pair of
 * widgets — the country picker and the text field agree on one string — and it
 * keeps its `name`, so the browser still posts every row when client JavaScript
 * never loads.
 */
export function PhoneListField() {
  const t = useTranslations("Registration");
  const tFields = useTranslations("Registration.fieldErrors");
  const labelId = useId();

  const { control, formState } = useFormContext<ProfileFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "phones" });

  // The list's own failure — too few, too many — as opposed to one bad entry.
  const listError = fieldCode(formState.errors.phones?.root?.message ?? formState.errors.phones?.message);

  return (
    <Field data-invalid={listError ? true : undefined} aria-labelledby={labelId}>
      <FieldTitle id={labelId}>{t("phonesLabel")}</FieldTitle>

      <div className="flex flex-col gap-2">
        {fields.map((row, index) => {
          const entryError = fieldCode(formState.errors.phones?.[index]?.value?.message);
          const inputId = `${labelId}-${index}`;
          const errorId = `${inputId}-error`;

          return (
            <div key={row.id} className="flex flex-col gap-1">
              <div className="flex items-start gap-2">
                <Controller
                  control={control}
                  name={`phones.${index}.value`}
                  render={({ field }) => (
                    <PhoneInput
                      id={inputId}
                      name="phones"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      aria-label={t("phoneLabel", { position: index + 1 })}
                      aria-invalid={entryError ? true : undefined}
                      aria-describedby={entryError ? errorId : undefined}
                      className="flex-1"
                    />
                  )}
                />
                {fields.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                  >
                    <X aria-hidden="true" />
                    <span className="sr-only">{t("removePhone", { position: index + 1 })}</span>
                  </Button>
                ) : null}
              </div>
              {entryError ? <FieldError id={errorId}>{tFields("phone")}</FieldError> : null}
            </div>
          );
        })}
      </div>

      {fields.length < MAX_PHONES ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => append({ value: "" })}
        >
          <Plus aria-hidden="true" />
          {t("addPhone")}
        </Button>
      ) : null}

      {listError ? (
        <FieldError>{tFields(listErrorKey(listError))}</FieldError>
      ) : (
        <FieldDescription>{t("phonesHint")}</FieldDescription>
      )}
    </Field>
  );
}

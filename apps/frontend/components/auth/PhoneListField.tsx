"use client";

import { useId, useState } from "react";
import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MAX_PHONES } from "@/lib/api/phone";
import type { FieldErrorCode } from "@/lib/api/types";

export interface PhoneListFieldProps {
  /** Numbers to start from. One empty row is shown when this is empty. */
  defaultValues?: readonly string[];
  /**
   * Errors pinned by the Server Action: `phones` for the list as a whole,
   * `phones.<index>` for one entry.
   */
  fields?: Record<string, FieldErrorCode | "INVALID">;
}

interface Row {
  /**
   * Rows are keyed, not indexed: removing the middle row must not let React
   * reuse its DOM node — and its typed value — for the row that follows.
   */
  key: string;
  value: string;
}

function initialRows(defaultValues: readonly string[]): Row[] {
  const values = defaultValues.length > 0 ? defaultValues : [""];
  return values.map((value, index) => ({ key: `initial-${index}`, value }));
}

/** Which message explains a list-level failure. */
function listErrorKey(code: FieldErrorCode | "INVALID"): "phonesMin" | "phonesMax" | "phone" {
  if (code === "ARRAY_MAX_SIZE") return "phonesMax";
  if (code === "IS_PHONE") return "phone";
  return "phonesMin";
}

/**
 * One to three phone numbers, in the owner's own order.
 *
 * Every row posts under the same `phones` name, so the action reads them with
 * `formData.getAll("phones")` and the list arrives already ordered — no index
 * bookkeeping in the request, and the form still submits if client JavaScript
 * never loads (the owner simply gets the rows the server rendered).
 */
export function PhoneListField({ defaultValues = [], fields }: PhoneListFieldProps) {
  const t = useTranslations("Registration");
  const tFields = useTranslations("Registration.fieldErrors");
  const labelId = useId();

  const [rows, setRows] = useState<Row[]>(() => initialRows(defaultValues));

  const listError = fields?.phones;

  return (
    <Field data-invalid={listError ? true : undefined} aria-labelledby={labelId}>
      <FieldTitle id={labelId}>{t("phonesLabel")}</FieldTitle>

      <div className="flex flex-col gap-2">
        {rows.map((row, index) => {
          const entryError = fields?.[`phones.${index}`];
          const inputId = `${labelId}-${index}`;
          const errorId = `${inputId}-error`;

          return (
            <div key={row.key} className="flex flex-col gap-1">
              <div className="flex items-start gap-2">
                <Input
                  id={inputId}
                  name="phones"
                  type="tel"
                  inputMode="tel"
                  autoComplete={index === 0 ? "tel" : "off"}
                  defaultValue={row.value}
                  placeholder={t("phonePlaceholder")}
                  aria-label={t("phoneLabel", { position: index + 1 })}
                  aria-invalid={entryError ? true : undefined}
                  aria-describedby={entryError ? errorId : undefined}
                  className="flex-1"
                />
                {rows.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setRows(rows.filter((candidate) => candidate.key !== row.key))}
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

      {rows.length < MAX_PHONES ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() =>
            setRows([...rows, { key: `added-${rows.length}-${Date.now()}`, value: "" }])
          }
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

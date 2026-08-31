"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { IDLE, type FormState } from "@/lib/api/form-state";

import { ProfileFields } from "./ProfileFields";

export interface CompleteProfileFormProps {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  locale: string;
  /** Where the owner was headed before the gate stopped them. */
  next?: string;
}

/**
 * The way out for an account that has credentials but no restaurant.
 *
 * Only accounts created before profiles existed can reach this — registration
 * has written a profile in the same transaction as the account ever since — but
 * the route stays as the gate's counterpart: something has to be reachable when
 * the dashboard is not.
 */
export function CompleteProfileForm({ action, locale, next }: CompleteProfileFormProps) {
  const t = useTranslations("Registration");
  const tErrors = useTranslations("Auth.errors");
  const [state, formAction, pending] = useActionState(action, IDLE);

  const fields = state.status === "error" ? state.fields : undefined;
  const summary = state.status === "error" && !fields ? state.code : undefined;

  return (
    <form action={formAction} noValidate className="flex flex-col gap-6">
      <input type="hidden" name="locale" value={locale} />
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {t("completeTitle")}
        </h1>
        <p className="text-muted-foreground text-sm">{t("completeSubtitle")}</p>
      </div>

      {summary ? (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
        >
          {tErrors(summary)}
        </p>
      ) : null}

      <FieldGroup>
        <ProfileFields fields={fields} />
      </FieldGroup>

      <Button type="submit" disabled={pending}>
        {pending ? t("pending") : t("completeSubmit")}
      </Button>
    </form>
  );
}

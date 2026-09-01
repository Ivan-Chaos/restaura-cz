"use client";

import { useTranslations } from "next-intl";
import { FormProvider } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { useActionForm, type ServerAction } from "@/hooks/use-action-form";
import { profileFieldPath, profileFormData } from "@/lib/validation/form-values";
import { profileFormSchema } from "@/lib/validation/schemas";

import { ProfileFields } from "./ProfileFields";

export interface CompleteProfileFormProps {
  action: ServerAction;
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

  const { form, formAction, onSubmit, pending, summary } = useActionForm({
    action,
    schema: profileFormSchema,
    defaultValues: { restaurantName: "", phones: [{ value: "" }], location: "" },
    toFormData: (values) => profileFormData(values, { locale, next }),
    toFieldPath: profileFieldPath,
  });

  return (
    <FormProvider {...form}>
      <form action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
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
          <ProfileFields />
        </FieldGroup>

        <Button type="submit" disabled={pending}>
          {pending ? t("pending") : t("completeSubmit")}
        </Button>
      </form>
    </FormProvider>
  );
}

"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { FormProvider } from "react-hook-form";

import { ProfileFields } from "@/components/auth/ProfileFields";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { useActionForm, type ServerAction } from "@/hooks/use-action-form";
import type { RestaurantProfile } from "@/lib/api/types";
import { profileFieldPath, profileFormData } from "@/lib/validation/form-values";
import { profileFormSchema } from "@/lib/validation/schemas";

export interface ProfileSettingsFormProps {
  profile: RestaurantProfile;
  action: ServerAction;
  locale: string;
}

/**
 * Editing the restaurant's details after registration.
 *
 * The same fields under the same rules as registration — it reuses
 * `ProfileFields` rather than restating them, which is what makes "settings
 * validates exactly like sign-up" true rather than merely intended.
 *
 * Success keeps the owner on the page: they came to settings to change things,
 * possibly several, and being redirected after the first would be a worse
 * version of what they asked for. A rejection keeps their edits for the same
 * reason.
 */
export function ProfileSettingsForm({ profile, action, locale }: ProfileSettingsFormProps) {
  const t = useTranslations("Settings");
  const tErrors = useTranslations("Auth.errors");

  const { form, formAction, onSubmit, pending, state, summary } = useActionForm({
    action,
    schema: profileFormSchema,
    defaultValues: {
      restaurantName: profile.restaurantName,
      // The stored list, one row per number, in the owner's own order.
      phones: profile.phones.map((value) => ({ value })),
      location: profile.location,
    },
    toFormData: (values) => profileFormData(values, { locale }),
    toFieldPath: profileFieldPath,
  });

  return (
    <FormProvider {...form}>
      <form
        action={formAction}
        onSubmit={onSubmit}
        noValidate
        className="flex max-w-md flex-col gap-6"
      >
        <input type="hidden" name="locale" value={locale} />

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

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? t("saving") : t("save")}
          </Button>

          {state.status === "success" ? (
            <p role="status" className="text-success flex items-center gap-1.5 text-sm">
              <Check aria-hidden="true" className="size-4" />
              {t("saved")}
            </p>
          ) : null}
        </div>
      </form>
    </FormProvider>
  );
}

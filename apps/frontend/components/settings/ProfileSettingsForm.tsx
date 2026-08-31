"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";

import { ProfileFields } from "@/components/auth/ProfileFields";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { IDLE, type FormState } from "@/lib/api/form-state";
import type { RestaurantProfile } from "@/lib/api/types";

export interface ProfileSettingsFormProps {
  profile: RestaurantProfile;
  action: (state: FormState, formData: FormData) => Promise<FormState>;
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
 * version of what they asked for.
 */
export function ProfileSettingsForm({ profile, action, locale }: ProfileSettingsFormProps) {
  const t = useTranslations("Settings");
  const tErrors = useTranslations("Auth.errors");
  const [state, formAction, pending] = useActionState(action, IDLE);

  const fields = state.status === "error" ? state.fields : undefined;
  const summary = state.status === "error" && !fields ? state.code : undefined;

  return (
    <form action={formAction} noValidate className="flex max-w-md flex-col gap-6">
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
        <ProfileFields defaultValues={profile} fields={fields} />
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
  );
}

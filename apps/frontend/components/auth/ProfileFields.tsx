"use client";

import { useTranslations } from "next-intl";
import { useFormContext } from "react-hook-form";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { fieldCode } from "@/hooks/use-action-form";
import type { ProfileFormValues } from "@/lib/validation/schemas";

import { PhoneListField } from "./PhoneListField";

/**
 * The restaurant's identity: name, phone numbers, address.
 *
 * Registration, the profile-completion step and the settings form all collect
 * exactly the same values under exactly the same rules, so they collect them
 * through one component — three copies would drift the first time a rule moved.
 *
 * Values and errors come from form context rather than props: every caller
 * already owns a `useForm`, and threading `register`/`errors` through would be
 * the same wiring written three times.
 */
export function ProfileFields() {
  const t = useTranslations("Registration");
  const tFields = useTranslations("Registration.fieldErrors");

  const { register, formState } = useFormContext<ProfileFormValues>();

  const nameError = fieldCode(formState.errors.restaurantName?.message);
  const locationError = fieldCode(formState.errors.location?.message);

  return (
    <>
      <Field data-invalid={nameError ? true : undefined}>
        <FieldLabel htmlFor="restaurantName">{t("restaurantNameLabel")}</FieldLabel>
        <Input
          id="restaurantName"
          autoComplete="organization"
          placeholder={t("restaurantNamePlaceholder")}
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameError ? "restaurantName-error" : undefined}
          {...register("restaurantName")}
        />
        {nameError ? (
          <FieldError id="restaurantName-error">{tFields("restaurantName")}</FieldError>
        ) : null}
      </Field>

      <PhoneListField />

      <Field data-invalid={locationError ? true : undefined}>
        <FieldLabel htmlFor="location">{t("locationLabel")}</FieldLabel>
        <Input
          id="location"
          autoComplete="street-address"
          placeholder={t("locationPlaceholder")}
          aria-invalid={locationError ? true : undefined}
          aria-describedby={locationError ? "location-error" : undefined}
          {...register("location")}
        />
        {locationError ? (
          <FieldError id="location-error">{tFields("location")}</FieldError>
        ) : null}
      </Field>
    </>
  );
}

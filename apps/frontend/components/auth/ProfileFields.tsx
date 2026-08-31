"use client";

import { useTranslations } from "next-intl";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { RestaurantProfile } from "@/lib/api/types";
import type { FieldErrorCode } from "@/lib/api/types";

import { PhoneListField } from "./PhoneListField";

export interface ProfileFieldsProps {
  /** Existing values, when editing rather than registering. */
  defaultValues?: RestaurantProfile;
  /** Errors pinned to `restaurantName`, `phones`, `phones.<index>`, `location`. */
  fields?: Record<string, FieldErrorCode | "INVALID">;
}

/**
 * The restaurant's identity: name, phone numbers, address.
 *
 * Registration, the profile-completion step and the settings form all collect
 * exactly the same values under exactly the same rules, so they collect them
 * through one component — three copies would drift the first time a rule moved.
 */
export function ProfileFields({ defaultValues, fields }: ProfileFieldsProps) {
  const t = useTranslations("Registration");
  const tFields = useTranslations("Registration.fieldErrors");

  const nameError = fields?.restaurantName;
  const locationError = fields?.location;

  return (
    <>
      <Field data-invalid={nameError ? true : undefined}>
        <FieldLabel htmlFor="restaurantName">{t("restaurantNameLabel")}</FieldLabel>
        <Input
          id="restaurantName"
          name="restaurantName"
          autoComplete="organization"
          defaultValue={defaultValues?.restaurantName}
          placeholder={t("restaurantNamePlaceholder")}
          required
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameError ? "restaurantName-error" : undefined}
        />
        {nameError ? (
          <FieldError id="restaurantName-error">{tFields("restaurantName")}</FieldError>
        ) : null}
      </Field>

      <PhoneListField defaultValues={defaultValues?.phones} fields={fields} />

      <Field data-invalid={locationError ? true : undefined}>
        <FieldLabel htmlFor="location">{t("locationLabel")}</FieldLabel>
        <Input
          id="location"
          name="location"
          autoComplete="street-address"
          defaultValue={defaultValues?.location}
          placeholder={t("locationPlaceholder")}
          required
          aria-invalid={locationError ? true : undefined}
          aria-describedby={locationError ? "location-error" : undefined}
        />
        {locationError ? (
          <FieldError id="location-error">{tFields("location")}</FieldError>
        ) : null}
      </Field>
    </>
  );
}

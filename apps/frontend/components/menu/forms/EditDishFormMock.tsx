"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import type { AllergenNumber, DietaryMarkerId } from "@/lib/design-system/dietary";
import type { Availability, PriceModel } from "@/lib/design-system/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { AvailabilitySwitch } from "./AvailabilitySwitch";
import { DietaryPicker } from "./DietaryPicker";
import { PriceInput } from "./PriceInput";

export interface EditDishFormMockProps {
  /** When true, the simulated save rejects instead of resolving — drives the failure-toast story. */
  simulateFailure?: boolean;
  className?: string;
}

interface DishDraft {
  name: string;
  description: string;
  category: string;
  price: PriceModel;
  dietary: DietaryMarkerId[];
  allergens: AllergenNumber[];
  availability: Availability;
}

const CATEGORY_IDS = ["starters", "mains", "desserts", "drinks"] as const;

const INITIAL_DRAFT: DishDraft = {
  name: "",
  description: "",
  category: "",
  price: { kind: "single", amount: { amount: 0, currency: "CZK" } },
  dietary: [],
  allergens: [],
  availability: "available",
};

/**
 * Simulated network latency for the mock save. Short and fixed — long enough
 * to make the loading state visible, short enough that `play` tests awaiting
 * the toast don't need a generous timeout to avoid flaking.
 */
const SAVE_DELAY_MS = 600;

/**
 * A complete "edit dish" form, composed entirely from this design system's
 * form vocabulary. Nothing here talks to a backend: submitting mutates local
 * state and resolves (or, with `simulateFailure`, rejects) after a fixed
 * delay, purely to prove the loading/success/error states other real forms
 * will need.
 */
export function EditDishFormMock({ simulateFailure = false, className }: EditDishFormMockProps) {
  const t = useTranslations("Forms");
  const tCategories = useTranslations("SampleMenu.categories");

  const [draft, setDraft] = useState<DishDraft>(INITIAL_DRAFT);
  const [nameError, setNameError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const nameId = useId();
  const nameErrorId = useId();
  const descriptionId = useId();
  const categoryId = useId();
  const nameInputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;

    if (draft.name.trim() === "") {
      setNameError(true);
      nameInputRef.current?.focus();
      return;
    }
    setNameError(false);
    setIsSaving(true);

    window.setTimeout(() => {
      setIsSaving(false);
      if (simulateFailure) {
        toast.error(t("saveFailed"));
      } else {
        toast.success(t("saved"));
      }
    }, SAVE_DELAY_MS);
  }

  return (
    <form
      data-slot="edit-dish-form"
      className={cn("flex flex-col gap-6", className)}
      onSubmit={handleSubmit}
      noValidate
    >
      <FieldGroup>
        <Field data-invalid={nameError}>
          <FieldLabel htmlFor={nameId}>{t("name")}</FieldLabel>
          <Input
            id={nameId}
            ref={nameInputRef}
            required
            aria-invalid={nameError}
            aria-describedby={nameError ? nameErrorId : undefined}
            value={draft.name}
            onChange={(event) => {
              const name = event.target.value;
              setDraft((prev) => ({ ...prev, name }));
              if (nameError && name.trim() !== "") setNameError(false);
            }}
          />
          {nameError && <FieldError id={nameErrorId}>{t("required")}</FieldError>}
        </Field>

        <Field>
          <FieldLabel htmlFor={descriptionId}>{t("description")}</FieldLabel>
          <Textarea
            id={descriptionId}
            value={draft.description}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, description: event.target.value }))
            }
          />
        </Field>

        <Field>
          <FieldLabel htmlFor={categoryId}>{t("category")}</FieldLabel>
          <Select
            value={draft.category}
            onValueChange={(category) =>
              setDraft((prev) => ({ ...prev, category: category ?? "" }))
            }
          >
            <SelectTrigger id={categoryId}>
              <SelectValue placeholder={t("selectCategory")} />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_IDS.map((id) => (
                <SelectItem key={id} value={id}>
                  {tCategories(id)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          {/* FieldTitle, not FieldLabel: the skeleton below is a static
              placeholder, not a focusable control, so there's nothing for a
              native <label for> to associate with. */}
          <FieldTitle>{t("image")}</FieldTitle>
          <Skeleton className="h-32 w-full" role="img" aria-label={t("image")} />
        </Field>

        <PriceInput
          value={draft.price}
          onChange={(price) => setDraft((prev) => ({ ...prev, price }))}
        />

        <DietaryPicker
          value={draft.dietary}
          allergens={draft.allergens}
          onChange={({ dietary, allergens }) =>
            setDraft((prev) => ({ ...prev, dietary, allergens }))
          }
        />

        <AvailabilitySwitch
          value={draft.availability}
          onChange={(availability) => setDraft((prev) => ({ ...prev, availability }))}
        />
      </FieldGroup>

      <Button type="submit" disabled={isSaving}>
        {isSaving ? t("saving") : t("save")}
      </Button>
    </form>
  );
}

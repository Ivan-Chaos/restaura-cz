import { useEffect, type ReactNode } from "react";
import { FormProvider, useForm, type FieldValues, type Path } from "react-hook-form";

import type { FieldErrorCode } from "@/lib/api/types";

export interface FormHarnessProps<TValues extends FieldValues> {
  defaultValues: TValues;
  /**
   * Errors to start with, keyed by form path — `restaurantName`,
   * `phones.1.value`, or `phones` for the list as a whole. Lets a story render
   * the marked state without driving a whole submission to reach it.
   */
  errors?: Record<string, FieldErrorCode | "INVALID">;
  children: ReactNode;
}

/**
 * Form context for the field components, which read it rather than taking
 * values and errors as props.
 *
 * Lives in `.storybook/` rather than `components/` because it is scaffolding
 * for stories, not part of the product — and because every component under
 * `components/` is required to have a story of its own, which this has no
 * business needing.
 */
export function FormHarness<TValues extends FieldValues>({
  defaultValues,
  errors,
  children,
}: FormHarnessProps<TValues>) {
  const form = useForm<TValues>({ defaultValues: defaultValues as never });

  // After mount, not during the first render: react-hook-form drops an error
  // set before its field has registered itself, so a story would render clean
  // and the assertion would fail for a reason that has nothing to do with the
  // component.
  useEffect(() => {
    for (const [path, code] of Object.entries(errors ?? {})) {
      form.setError(path as Path<TValues>, { type: "server", message: code });
    }
    // Stories set these once; re-applying on every render would fight any edit
    // a play function makes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <FormProvider {...form}>
      <form noValidate>{children}</form>
    </FormProvider>
  );
}

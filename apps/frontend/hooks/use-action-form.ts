"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useForm,
  type DefaultValues,
  type FieldValues,
  type Path,
  type Resolver,
  type UseFormReturn,
} from "react-hook-form";
import type { ZodType } from "zod";

import { IDLE, type FormState } from "@/lib/api/form-state";
import type { ApiErrorCode, FieldErrorCode } from "@/lib/api/types";

export type ServerAction = (state: FormState, formData: FormData) => Promise<FormState>;

export interface UseActionFormOptions<TValues extends FieldValues> {
  /**
   * Injected rather than imported so the form can be rendered in Storybook and
   * tests without pulling a Server Action into the browser bundle.
   */
  action: ServerAction;
  schema: ZodType<unknown, TValues>;
  defaultValues: DefaultValues<TValues>;
  /** Turns validated values into the body the Server Action reads. */
  toFormData: (values: TValues) => FormData;
  /**
   * Maps an API field path onto a form path, where the two differ. Only the
   * phone list needs it, and only because `useFieldArray` cannot hold bare
   * strings.
   */
  toFieldPath?: (apiField: string) => string;
  /**
   * Runs once per submission that came back clean — to empty the form for the
   * next dish, close an editing row, or say what was saved.
   *
   * Called from an effect, never during render, because a caller legitimately
   * wants to set its own state here. Keyed on the pending edge rather than on
   * the identity of `state`: a stubbed action that hands back the same object
   * twice would otherwise be noticed once, which is exactly what a story does.
   */
  onSuccess?: (form: UseFormReturn<TValues>) => void;
}

export interface ActionForm<TValues extends FieldValues> {
  form: UseFormReturn<TValues>;
  /**
   * Goes on `<form action={…}>`. It is what makes the form work without client
   * JavaScript: the browser posts straight to the Server Action. With
   * JavaScript, `onSubmit` preventDefaults first, so React never runs this path
   * — nor the form reset it performs afterwards.
   */
  formAction: (formData: FormData) => void;
  /** Goes on `<form onSubmit={…}>`, alongside `action`. */
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  pending: boolean;
  /** The last server outcome, for success banners and form-level messages. */
  state: FormState;
  /** A form-level code to render, or undefined when the failure is per-field. */
  summary: ApiErrorCode | undefined;
}

/**
 * One form, validated by zod in the browser and again on the server.
 *
 * Three problems this solves together, which is why it is one hook:
 *
 * 1. **Values survive a rejection.** React resets an uncontrolled form once its
 *    `action` completes, so a taken email used to wipe the restaurant name,
 *    phones and address along with it. Because react-hook-form owns the values
 *    and submission goes through `handleSubmit` — which preventDefaults, so
 *    React never runs its reset — what the owner typed is still there.
 *
 * 2. **Server failures land on the field at fault.** `state.fields` is fed back
 *    into the form with `setError`, so an API rejection is marked and described
 *    exactly like one caught in the browser.
 *
 * 3. **The form still works without client JavaScript.** The `action` stays on
 *    the element; with JS this handler intercepts, without it the browser posts
 *    and the Server Action validates with the same rules.
 */
export function useActionForm<TValues extends FieldValues>({
  action,
  schema,
  defaultValues,
  toFormData,
  toFieldPath,
  onSuccess,
}: UseActionFormOptions<TValues>): ActionForm<TValues> {
  const [state, formAction, pending] = useActionState(action, IDLE);

  const form = useForm<TValues>({
    // The resolver is typed against the schema's *input*, which is what the
    // form holds; the action re-parses to get the output shape. `raw` is what
    // keeps that true for a schema that transforms — a price leaves this form
    // as the string that was typed, and the action is the one place that turns
    // it into a number.
    resolver: zodResolver(schema, undefined, { raw: true }) as unknown as Resolver<TValues>,
    defaultValues,
    // Re-validate as the owner fixes a field, but do not complain before they
    // have said they are finished: an error under a field someone merely tabbed
    // through is nagging, not help.
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  /**
   * Server errors are applied during render rather than in an effect — the
   * value derives from `state`, and React recommends deriving over
   * synchronising. Guarded by the last state we acted on so the errors are not
   * re-applied on every render, which would fight the owner's edits.
   */
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    if (state.status === "error" && state.fields) {
      for (const [apiField, code] of Object.entries(state.fields)) {
        const path = (toFieldPath?.(apiField) ?? apiField) as Path<TValues>;
        form.setError(path, { type: "server", message: code });
      }
    }
  }

  /**
   * The success callback, on the falling edge of `pending`.
   *
   * `useEffectEvent` so the callback the effect runs is always the current one
   * without the callback being a dependency: a caller passing an inline closure
   * would otherwise re-run this effect on every render.
   */
  const settled = useEffectEvent((outcome: FormState) => {
    if (outcome.status === "success") onSuccess?.(form);
  });
  const wasPending = useRef(false);

  useEffect(() => {
    if (pending) {
      wasPending.current = true;
      return;
    }
    // Nothing has been submitted yet, so there is no outcome to act on: the
    // initial state is not a result.
    if (!wasPending.current) return;
    wasPending.current = false;
    settled(state);
  }, [pending, state]);

  const onSubmit = form.handleSubmit((values) => {
    // Inside a transition, because dispatching outside one leaves `pending`
    // stuck at false — the submit button would never disable and never say it
    // is working. React warns about this; it is not merely a lint preference.
    startTransition(() => {
      formAction(toFormData(values as TValues));
    });
  });

  // A summary only when nothing is pinned to a specific input; otherwise the
  // same problem would be reported twice.
  const summary =
    state.status === "error" && !state.fields ? state.code : undefined;

  return { form, formAction, onSubmit, pending, state, summary };
}

/**
 * The code under one field, whether the browser or the API found it.
 *
 * Messages are `FieldErrorCode` strings rather than prose, so a component
 * translates one catalogue and never has to ask where the problem was noticed.
 */
export function fieldCode(message: unknown): FieldErrorCode | "INVALID" | undefined {
  return typeof message === "string" && message !== ""
    ? (message as FieldErrorCode | "INVALID")
    : undefined;
}

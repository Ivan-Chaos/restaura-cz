"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ServerAction } from "@/hooks/use-action-form";
import type { InlineTextField } from "@/lib/validation/schemas";

import { InlineTextForm } from "./InlineTextForm";

export interface EditableTitleProps {
  /** The name as it stands. Rendered as a heading until Rename is pressed. */
  value: string;
  /** Which heading level this is in the page's outline. */
  as: "h1" | "h2" | "h3";
  /** Id the surrounding landmark points at with `aria-labelledby`. */
  id?: string;
  action: ServerAction;
  field: InlineTextField;
  /** The accessible name of the input, once the form is open. */
  label: string;
  /** The button that opens the form, e.g. "Rename". */
  renameLabel: string;
  submitLabel: string;
  pendingLabel: string;
  successMessage?: string;
  /** Ids the action needs: locale, menuId and, for a section, sectionId. */
  hidden: Record<string, string>;
  className?: string;
  headingClassName?: string;
}

/**
 * A title that reads as a title until somebody asks to change it.
 *
 * The editor used to render every name as a permanently open text input beside
 * a "Save" button, which made a section that already exists look exactly like
 * the empty form for adding one — and made "Save" look like it might be saving
 * the whole menu. A heading is a heading; renaming is a thing you choose to do.
 *
 * The heading keeps its `id` through both states, so the `aria-labelledby` on
 * the section around it never points at nothing.
 */
export function EditableTitle({
  value,
  as,
  id,
  action,
  field,
  label,
  renameLabel,
  submitLabel,
  pendingLabel,
  successMessage,
  hidden,
  className,
  headingClassName,
}: EditableTitleProps) {
  const [renaming, setRenaming] = useState(false);
  const Heading = as;

  if (renaming) {
    return (
      <div className={cn("min-w-60 flex-1", className)}>
        {/*
          Kept in the outline while the form is open, and kept as the label of
          the landmark this sits in: hiding it visually is enough.
        */}
        <Heading id={id} className="sr-only">
          {value}
        </Heading>
        <InlineTextForm
          action={action}
          field={field}
          label={label}
          labelHidden
          submitLabel={submitLabel}
          pendingLabel={pendingLabel}
          defaultValue={value}
          hidden={hidden}
          successMessage={successMessage}
          onCancel={() => setRenaming(false)}
          onSuccess={() => setRenaming(false)}
        />
      </div>
    );
  }

  return (
    <div className={cn("flex min-w-0 flex-1 flex-wrap items-center gap-2", className)}>
      <Heading id={id} className={headingClassName}>
        {value}
      </Heading>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setRenaming(true)}
      >
        <Pencil aria-hidden="true" />
        {renameLabel}
      </Button>
    </div>
  );
}

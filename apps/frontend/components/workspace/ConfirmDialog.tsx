"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export interface ConfirmDialogProps {
  triggerLabel: string;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Injected Server Action; runs only after the visitor confirms. */
  action: (formData: FormData) => Promise<void>;
  /** Ids the action needs: locale, menuId, sectionId, itemId. */
  hidden: Record<string, string>;
}

/**
 * Deleting a menu, a section or a dish removes content that cannot be
 * recovered, so all three ask first — through this one component, so the
 * question is always phrased and dismissed the same way.
 *
 * A dialog rather than `window.confirm`: a native confirm blocks the page, is
 * not themeable, and cannot be translated.
 */
export function ConfirmDialog({
  triggerLabel,
  title,
  description,
  confirmLabel,
  cancelLabel,
  action,
  hidden,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm" />}>
        {triggerLabel}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{cancelLabel}</DialogClose>
          <form action={action}>
            {Object.entries(hidden).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            <Button type="submit" variant="destructive">
              {confirmLabel}
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

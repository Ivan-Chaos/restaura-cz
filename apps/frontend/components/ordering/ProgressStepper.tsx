import { CircleCheck } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Not shipped yet: a guest today has no order to track through steps.
 * Reserved for a future ordering flow's "received → preparing → ready"
 * progress display.
 *
 * A Server Component — it only renders what it's given, so it costs nothing
 * to keep out of the client bundle. Completed/current state is carried by
 * `aria-current="step"` plus a checkmark glyph, not colour alone, and steps
 * wrap onto new lines rather than being forced into one unreadable row on a
 * 320px phone.
 */
export interface ProgressStepperProps {
  steps: { id: string; label: string }[];
  currentId: string;
  className?: string;
}

export function ProgressStepper({ steps, currentId, className }: ProgressStepperProps) {
  const currentIndex = steps.findIndex((step) => step.id === currentId);

  return (
    <ol
      data-slot="progress-stepper"
      data-ordering=""
      className={cn("flex flex-wrap items-start gap-x-4 gap-y-3", className)}
    >
      {steps.map((step, index) => {
        const isCompleted = currentIndex >= 0 && index < currentIndex;
        const isCurrent = step.id === currentId;

        return (
          <li
            key={step.id}
            aria-current={isCurrent ? "step" : undefined}
            className="flex items-center gap-2"
          >
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                isCompleted && "border-success bg-success text-success-foreground",
                isCurrent && "border-primary bg-primary text-primary-foreground",
                !isCompleted && !isCurrent && "border-border text-muted-foreground",
              )}
            >
              {isCompleted ? <CircleCheck aria-hidden className="size-4" /> : index + 1}
            </span>
            <span
              className={cn(
                "text-sm",
                isCurrent ? "font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

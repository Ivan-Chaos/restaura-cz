import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface AppearanceScopeProps {
  className?: string;
  children?: ReactNode;
}

/**
 * Pins its subtree to the light appearance.
 *
 * The owner dashboard is specified as light-toned whatever the visitor's device
 * is set to (spec FR-011), and this is the whole implementation: an attribute
 * that `styles/themes/warm.css` redeclares the light tokens against. Because
 * those tokens are inherited, a scope nearer the element wins over `.dark` on
 * `<html>` without a specificity fight.
 *
 * Consequences worth stating: it ships **no JavaScript**, works in Server
 * Components, and cannot flash — the correct colours are in the first byte of
 * HTML. It is also strictly local. Nothing outside this subtree changes, and
 * the visitor's stored appearance preference is neither read nor written, so
 * the landing page and a guest's menu still honour their dark mode.
 *
 * The light/dark axis is otherwise owned by `AppearanceProvider`, and menu
 * themes by `ThemeScope`; this is a third, deliberately narrow scope that
 * overrides the first for one route segment.
 */
export function AppearanceScope({ className, children }: AppearanceScopeProps) {
  return (
    <div
      data-appearance="light"
      data-slot="appearance-scope"
      className={cn("bg-background text-foreground", className)}
    >
      {children}
    </div>
  );
}

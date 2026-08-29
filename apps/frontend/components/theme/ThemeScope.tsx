import type { ElementType, ReactNode } from "react";

import { cn } from "@/lib/utils";
import { toThemeId, type ThemeId } from "@/lib/design-system/themes";

/**
 * Applies a menu theme to a subtree.
 *
 * Theming is an attribute, not a context: every semantic token is redefined
 * under `[data-theme="…"]` in CSS, and Tailwind utilities are declared with
 * `@theme inline` so they resolve against whatever scope they render in. That
 * means this component ships **no JavaScript**, works in Server Components, and
 * survives SSR with no flash — and a component inside it needs no awareness
 * that it is themed at all (spec FR-006, FR-008).
 *
 * Nesting works: a `slate` scope inside a `warm` page re-resolves every token
 * for its subtree only.
 *
 * Appearance (light/dark) is a separate, orthogonal axis owned by
 * `AppearanceProvider`; any theme × any appearance is valid (spec FR-009).
 */
export interface ThemeScopeProps {
  /** Theme id. An unrecognised value falls back to the default theme. */
  theme: ThemeId | (string & {});
  /**
   * Element to render. Defaults to a `display: contents` wrapper so the scope
   * is invisible to layout — it adds a DOM node but no box.
   */
  as?: ElementType;
  className?: string;
  children?: ReactNode;
}

export function ThemeScope({
  theme,
  as: Component = "div",
  className,
  children,
  ...props
}: ThemeScopeProps & { [key: string]: unknown }) {
  return (
    <Component
      data-theme={toThemeId(theme)}
      data-slot="theme-scope"
      className={cn("contents", className)}
      {...props}
    >
      {children}
    </Component>
  );
}

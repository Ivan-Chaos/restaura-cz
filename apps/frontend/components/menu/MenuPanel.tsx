import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * The panel that groups one category's dishes.
 *
 * Under most themes this is an invisible box: `--panel` and `--panel-border`
 * are `transparent`, `--panel-blur` and `--panel-inset` are `0px`, so it adds
 * a DOM node and nothing else — no colour, no edge, no padding, no layout
 * shift. A frosted theme such as Liquid Glass sets those four tokens and the
 * same markup becomes a translucent, blurred card with an inner margin.
 *
 * Putting the blur here rather than on each dish is deliberate: backdrop
 * filters are paid per element, and one per category is a bounded cost on a
 * mid-tier phone where one per row is not (spec 005 PR-003).
 *
 * A Server Component with no state.
 */
export type MenuPanelProps = ComponentProps<"div">;

export function MenuPanel({ className, children, ...props }: MenuPanelProps) {
  return (
    <div
      data-slot="menu-panel"
      className={cn(
        "bg-panel border-panel-border backdrop-blur-panel rounded-xl border p-panel",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

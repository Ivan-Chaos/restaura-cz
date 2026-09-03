import { ThemeScope } from "@/components/theme/ThemeScope";
import type { ThemeId } from "@/lib/design-system/themes";
import { cn } from "@/lib/utils";

export interface VariantSwatchProps {
  themeId: ThemeId;
  className?: string;
}

/**
 * A thumbnail of a menu style, made of nothing but that style's tokens.
 *
 * `ThemeScope` re-resolves every token for this one box, so the ground, the
 * display face, the primary colour and the price colour are the real ones —
 * there is no image to keep in sync when a theme changes. It always shows the
 * style's light appearance, because it sits in the light-locked dashboard and
 * the dark variant is a click away in the preview.
 *
 * Decorative: the label next to it carries the name.
 */
export function VariantSwatch({ themeId, className }: VariantSwatchProps) {
  return (
    <ThemeScope
      as="span"
      theme={themeId}
      aria-hidden="true"
      data-appearance="light"
      className={cn(
        "ambient bg-background text-foreground border-border flex h-14 w-20 shrink-0 items-center justify-between overflow-hidden rounded-md border px-2",
        className,
      )}
    >
      <span className="font-display text-lg leading-none">Aa</span>
      <span className="flex flex-col items-end gap-1">
        <span className="bg-primary block size-3 rounded-full" />
        {/* The currency alone, in the price colour. Not a real amount: the
            swatch sits on the editor page beside real prices, and a sample
            that read "89 Kč" was indistinguishable from a dish that costs it. */}
        <span className="text-price text-xs leading-none font-medium">Kč</span>
      </span>
    </ThemeScope>
  );
}

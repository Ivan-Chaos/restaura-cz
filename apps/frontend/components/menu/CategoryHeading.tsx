import type { SectionStyle } from "@/lib/menu-display/presentation";
import { cn } from "@/lib/utils";

/**
 * The heading for one menu category.
 *
 * `Section` already owns the `<section>` landmark; this component renders
 * only the `<h2>` and its supporting text so it can sit inside `Section`
 * without producing a duplicate landmark or a second heading. Pass `id` to
 * match a `Section`'s `aria-labelledby`.
 *
 * Six styles (feature 005). The numbered and roman styles print an ordinal
 * beside the name; it is `aria-hidden`, so the heading's accessible name stays
 * the category name and nothing that navigates by heading has to skip "I." or
 * "01".
 */
export interface CategoryHeadingProps {
  name: string;
  description?: string;
  count?: number;
  id?: string;
  style?: SectionStyle;
  /** Zero-based position of the category; used by the numbered styles. */
  index?: number;
  className?: string;
}

const ROMAN: readonly [number, string][] = [
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

/** 1 → "I", 4 → "IV"; a menu never has more than a handful of categories. */
export function toRoman(value: number): string {
  let rest = Math.max(1, Math.floor(value));
  let out = "";
  for (const [n, glyph] of ROMAN) {
    while (rest >= n) {
      out += glyph;
      rest -= n;
    }
  }
  return out;
}

export function CategoryHeading({
  name,
  description,
  count,
  id,
  style = "classic",
  index = 0,
  className,
}: CategoryHeadingProps) {
  const centered = style === "roman";

  const countNode =
    typeof count === "number" ? (
      <span
        className={cn(
          "text-sm",
          style === "bar" ? "text-primary-foreground/80" : "text-muted-foreground",
          style === "caps" && "text-xs",
        )}
      >
        ({count})
      </span>
    ) : null;

  return (
    <div
      data-slot="category-heading"
      data-style={style}
      className={cn(
        "mb-4 flex flex-col gap-1",
        style === "caps" && "border-border border-b pb-2",
        style === "bar" && "bg-primary text-primary-foreground -mx-1 rounded-sm px-3 py-1.5",
        style === "numbered" && "mb-6 gap-0",
        centered && "mb-6 items-center text-center",
        className,
      )}
    >
      {style === "numbered" ? (
        <span
          aria-hidden="true"
          className="text-primary font-display text-sm font-extrabold tracking-widest"
        >
          {String(index + 1).padStart(2, "0")}
        </span>
      ) : null}
      {centered ? (
        <span
          aria-hidden="true"
          className="text-muted-foreground font-display text-sm tracking-widest"
        >
          {toRoman(index + 1)}
        </span>
      ) : null}

      <div className={cn("flex flex-wrap items-baseline gap-2", centered && "justify-center")}>
        {style === "glass" ? (
          <span aria-hidden="true" className="bg-primary size-2 shrink-0 self-center rounded-full" />
        ) : null}
        <h2
          id={id}
          className={cn(
            "font-display break-words leading-tight",
            style === "classic" && "text-2xl",
            style === "caps" && "font-body text-xs font-medium tracking-widest uppercase",
            style === "glass" && "text-xl font-semibold tracking-tight",
            style === "bar" && "text-lg tracking-widest uppercase",
            style === "numbered" && "text-4xl font-extrabold tracking-tight",
            centered && "text-3xl tracking-tight",
          )}
        >
          {name}
        </h2>
        {countNode}
      </div>

      {centered ? <span aria-hidden="true" className="bg-border mt-2 block h-px w-12" /> : null}

      {description ? (
        <p
          className={cn(
            "text-muted-foreground break-words text-sm",
            style === "bar" && "text-primary-foreground/80",
            centered && "mt-1 max-w-prose italic",
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}

import { cn } from "@/lib/utils";

/**
 * The heading for one menu category.
 *
 * `Section` already owns the `<section>` landmark; this component renders
 * only the `<h2>` and its supporting text so it can sit inside `Section`
 * without producing a duplicate landmark or a second heading. Pass `id` to
 * match a `Section`'s `aria-labelledby` when the composing page wires them
 * together manually instead of using `Section`'s own `title` prop.
 */
export interface CategoryHeadingProps {
  name: string;
  description?: string;
  count?: number;
  id?: string;
  className?: string;
}

export function CategoryHeading({
  name,
  description,
  count,
  id,
  className,
}: CategoryHeadingProps) {
  return (
    <div
      data-slot="category-heading"
      className={cn("mb-4 flex flex-col gap-1", className)}
    >
      <div className="flex flex-wrap items-baseline gap-2">
        <h2
          id={id}
          className="break-words font-display text-2xl leading-tight"
        >
          {name}
        </h2>
        {typeof count === "number" ? (
          <span className="text-sm text-muted-foreground">({count})</span>
        ) : null}
      </div>
      {description ? (
        <p className="break-words text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}

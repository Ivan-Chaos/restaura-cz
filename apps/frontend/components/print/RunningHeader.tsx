import { Container } from "@/components/layout/Container";

export interface RunningHeaderProps {
  /** The menu's name — what identifies the page a reader is holding. */
  title: string;
  restaurantName: string;
}

/**
 * The band repeated at the top of every printed page.
 *
 * A menu that runs to four sheets has to say what it is on all four, otherwise
 * a page that gets separated is anonymous (spec 007 FR-004). Printing repeats a
 * `position: fixed` element once per page, which is the whole implementation —
 * see `.print-running-band` in `print.css`.
 *
 * `aria-hidden`, because on screen and to assistive technology this is a
 * duplicate: `MenuHeader` below it already carries the accessible identity.
 */
export function RunningHeader({ title, restaurantName }: RunningHeaderProps) {
  return (
    <div
      aria-hidden="true"
      data-slot="running-header"
      className="print-running-band border-border bg-background text-muted-foreground border-b"
    >
      <Container size="md" className="flex items-baseline justify-between gap-4 py-1">
        <span className="font-display truncate text-sm">{title}</span>
        <span className="truncate text-xs">{restaurantName}</span>
      </Container>
    </div>
  );
}

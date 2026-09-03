"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { NavShape } from "@/lib/menu-display/presentation";
import { cn } from "@/lib/utils";

/**
 * Sticky category strip.
 *
 * On a phone a menu is long, and the guest's question is usually "where are the
 * mains?". This keeps the categories in reach while they scroll and shows which
 * one they are currently in.
 *
 * Built as a tablist-shaped list of links rather than shadcn `Tabs`: the
 * sections are all present in the document (a menu should be scrollable and
 * printable end to end, and anchors survive with JavaScript disabled), so this
 * navigates rather than swaps panels. Using `Tabs` would have implied the other
 * categories were hidden.
 */
export interface CategoryNavItem {
  id: string;
  name: string;
}

export interface CategoryNavProps {
  categories: CategoryNavItem[];
  /** Controlled active id. When omitted the component tracks scroll itself. */
  activeId?: string;
  onSelect?: (id: string) => void;
  /**
   * The strip's shape (feature 005): filled pills, a text row with an
   * underline, a floating glass bar, square uppercase tabs, heavy underlined
   * tabs, or letterspaced small caps. Behaviour is identical in all of them.
   */
  shape?: NavShape;
  className?: string;
  "aria-label"?: string;
}

export function CategoryNav({
  categories,
  activeId,
  onSelect,
  shape = "pills",
  className,
  "aria-label": ariaLabel,
}: CategoryNavProps) {
  const [spiedId, setSpiedId] = useState<string | undefined>(categories[0]?.id);
  const activeRef = useRef<HTMLAnchorElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  const active = activeId ?? spiedId;

  // Track which section the guest is actually looking at. The top band is
  // narrow so the highlight changes when a heading reaches the sticky strip,
  // not when a section merely peeks into view.
  useEffect(() => {
    if (activeId !== undefined) return;
    if (typeof IntersectionObserver === "undefined") return;

    const elements = categories
      .map(({ id }) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible[0]) setSpiedId(visible[0].target.id);
      },
      { rootMargin: "-72px 0px -70% 0px", threshold: 0 },
    );

    for (const element of elements) observer.observe(element);
    return () => observer.disconnect();
  }, [categories, activeId]);

  // Keep the active chip in view when scrolling changes it, or the guest cannot
  // see where they are.
  useEffect(() => {
    const chip = activeRef.current;
    const list = listRef.current;
    if (!chip || !list) return;

    const chipBox = chip.getBoundingClientRect();
    const listBox = list.getBoundingClientRect();
    if (chipBox.left < listBox.left || chipBox.right > listBox.right) {
      chip.scrollIntoView({ block: "nearest", inline: "center" });
    }
  }, [active]);

  const go = useCallback(
    (id: string) => {
      onSelect?.(id);
      if (activeId === undefined) setSpiedId(id);
      document.getElementById(id)?.scrollIntoView({ block: "start" });
    },
    [onSelect, activeId],
  );

  // Roving arrow-key navigation across the strip. Without this a keyboard user
  // has to tab through every category to reach the content.
  const onKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(event.key)) return;

    const links = Array.from(
      event.currentTarget.querySelectorAll<HTMLAnchorElement>("a[data-chip]"),
    );
    const index = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (index === -1) return;

    event.preventDefault();
    const next =
      event.key === "ArrowLeft"
        ? (index - 1 + links.length) % links.length
        : event.key === "ArrowRight"
          ? (index + 1) % links.length
          : event.key === "Home"
            ? 0
            : links.length - 1;

    links[next]?.focus();
  };

  if (categories.length === 0) return null;

  return (
    <nav
      data-slot="category-nav"
      data-shape={shape}
      aria-label={ariaLabel}
      className={cn(
        "sticky z-10",
        shape === "pills" && "bg-background/95 border-border top-0 border-b backdrop-blur",
        shape === "underline" && "bg-background border-border top-0 border-b",
        shape === "glass" && "top-2 px-4 sm:px-6",
        shape === "squares" && "bg-card text-card-foreground border-primary top-0 border-b-2",
        shape === "heavy" && "bg-background border-foreground top-0 border-b-2",
        shape === "text" && "bg-background/95 border-border top-0 border-b backdrop-blur",
        className,
      )}
    >
      <ul
        ref={listRef}
        onKeyDown={onKeyDown}
        // `scrollbar-none` is not a Tailwind default; the strip simply scrolls.
        // `relative` keeps absolutely positioned descendants (sr-only labels)
        // inside this scroll container rather than widening the document.
        // The measure matches `Container size="md"` so chips line up with the
        // content beneath them.
        className={cn(
          "relative mx-auto flex w-full max-w-4xl snap-x snap-mandatory overflow-x-auto",
          shape === "glass"
            ? "bg-panel border-panel-border backdrop-blur-panel shadow-card gap-1 rounded-full border px-2 py-1.5"
            : "gap-2 px-4 py-2 sm:px-6",
          (shape === "underline" || shape === "heavy" || shape === "text") && "gap-4 py-0",
          shape === "squares" && "gap-0 px-2 py-0 sm:px-4",
        )}
      >
        {categories.map((category) => {
          const isActive = category.id === active;
          return (
            <li key={category.id} className="snap-start">
              <a
                data-chip
                ref={isActive ? activeRef : undefined}
                href={`#${category.id}`}
                // `aria-current` is what tells a screen-reader user which
                // section they are in — the colour change alone would not.
                aria-current={isActive ? "true" : undefined}
                onClick={(event) => {
                  // Let modified clicks behave normally (open in a new tab).
                  if (event.metaKey || event.ctrlKey || event.shiftKey) return;
                  event.preventDefault();
                  go(category.id);
                }}
                className={cn(
                  "focus-visible:ring-ring inline-flex items-center whitespace-nowrap transition-colors outline-none focus-visible:ring-2",
                  (shape === "pills" || shape === "glass") && "rounded-full px-3 py-1.5 text-sm",
                  shape === "pills" &&
                    (isActive
                      ? "bg-primary text-primary-foreground font-medium"
                      : "bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground"),
                  shape === "glass" &&
                    (isActive
                      ? "bg-primary text-primary-foreground shadow-card font-medium"
                      : "text-foreground hover:bg-accent/60"),
                  shape === "underline" &&
                    cn(
                      "border-b-2 px-1 py-2.5 text-sm",
                      isActive
                        ? "border-foreground text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground border-transparent",
                    ),
                  shape === "squares" &&
                    cn(
                      "font-display px-3 py-2.5 text-xs tracking-widest uppercase",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-card-foreground hover:bg-secondary",
                    ),
                  shape === "heavy" &&
                    cn(
                      "font-display border-b-4 px-1 py-2.5 text-base font-bold",
                      isActive
                        ? "border-primary text-foreground"
                        : "text-muted-foreground hover:text-foreground border-transparent",
                    ),
                  shape === "text" &&
                    cn(
                      "font-display px-2 py-3 text-sm tracking-widest uppercase",
                      isActive
                        ? "decoration-primary text-foreground underline decoration-2 underline-offset-8"
                        : "text-muted-foreground hover:text-foreground",
                    ),
                )}
              >
                {category.name}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

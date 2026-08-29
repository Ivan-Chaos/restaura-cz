"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";

import { useIsHydrated } from "@/hooks/use-is-hydrated";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Switches light / dark / system.
 *
 * Deliberately three states rather than a two-way switch: "system" is the
 * default, and a guest who has set their phone to switch at sunset should be
 * able to get back to that after peeking at the other appearance.
 *
 * Note this controls *appearance* only. The menu's theme is a separate axis
 * owned by `ThemeScope` (spec FR-009).
 */
const OPTIONS = [
  { value: "light", icon: Sun, labelKey: "light" },
  { value: "dark", icon: Moon, labelKey: "dark" },
  { value: "system", icon: Monitor, labelKey: "system" },
] as const;

export interface AppearanceToggleProps {
  variant?: "icon" | "segmented";
  className?: string;
}

export function AppearanceToggle({
  variant = "icon",
  className,
}: AppearanceToggleProps) {
  const t = useTranslations("Appearance");
  const { theme, setTheme, resolvedTheme } = useTheme();

  // The stored preference is only known on the client. Rendering it before
  // hydration would either flash the wrong icon or trip a hydration mismatch,
  // so the control renders in a neutral state until then.
  const mounted = useIsHydrated();

  if (variant === "segmented") {
    return (
      <div
        role="group"
        aria-label={t("label")}
        className={cn(
          "bg-muted inline-flex items-center gap-0.5 rounded-lg p-0.5",
          className,
        )}
      >
        {OPTIONS.map(({ value, icon: Icon, labelKey }) => {
          const active = mounted && theme === value;
          return (
            <Button
              key={value}
              type="button"
              size="icon-sm"
              variant={active ? "secondary" : "ghost"}
              aria-pressed={active}
              aria-label={t(labelKey)}
              onClick={() => setTheme(value)}
            >
              <Icon aria-hidden="true" />
            </Button>
          );
        })}
      </div>
    );
  }

  // Icon variant: one button that advances light → dark → system.
  const currentIndex = mounted
    ? OPTIONS.findIndex((option) => option.value === theme)
    : -1;
  const current = OPTIONS[currentIndex] ?? OPTIONS[2];
  const next = OPTIONS[(Math.max(currentIndex, 0) + 1) % OPTIONS.length];

  // Before hydration show a stable, meaningful icon rather than guessing.
  const Icon = mounted
    ? current.value === "system"
      ? resolvedTheme === "dark"
        ? Moon
        : Sun
      : current.icon
    : Monitor;

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className={className}
      // The accessible name states the current setting; the title says what a
      // press will do. A blind user needs the former, a hovering user the latter.
      aria-label={`${t("label")}: ${t(current.labelKey)}`}
      title={t(next.labelKey)}
      onClick={() => setTheme(next.value)}
    >
      <Icon aria-hidden="true" />
    </Button>
  );
}

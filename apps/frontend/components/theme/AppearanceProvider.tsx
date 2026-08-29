"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

/**
 * Owns the light/dark axis.
 *
 * `next-themes` is configured for the class strategy so it toggles `.dark` on
 * `<html>`, which is exactly what the theme stylesheets and Tailwind's
 * `@custom-variant dark` key off. Because appearance is a class and menu theme
 * is an attribute, the two compose without either knowing about the other.
 *
 * `defaultTheme="system"` means a guest who opens a menu at a dim table gets
 * the dark variant without touching anything.
 */
export function AppearanceProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      // Suppresses the transition flash when switching appearance.
      disableTransitionOnChange
      storageKey="restaura-appearance"
    >
      {children}
    </ThemeProvider>
  );
}

#!/usr/bin/env node
/**
 * Design-token gate (spec SC-004).
 *
 * Fails the build if a component hard-codes a visual value instead of using a
 * semantic token. This is what makes "themes need zero component changes" true
 * rather than aspirational: a literal colour or a one-off spacing value cannot
 * respond to `<ThemeScope>`, so it silently breaks every theme but the one it
 * was eyeballed in.
 *
 * Scope: everything we author under `components/`. `components/ui/` is excluded
 * because it is generated verbatim by the shadcn CLI (constitution requires we
 * do not hand-edit it) and already references tokens; `styles/palette.css` is
 * the one sanctioned home for literal colour.
 *
 * Run by `pnpm lint`.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["components", "app"];
const EXCLUDED_DIRS = new Set(["node_modules", ".next", "ui"]);
const EXTENSIONS = new Set([".ts", ".tsx"]);

/** Patterns that indicate a value that should have been a token. */
const RULES = [
  {
    id: "hex-colour",
    // #abc / #aabbcc / #aabbccdd, not preceded by a word char (avoids ids).
    re: /(?<![\w&])#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g,
    hint: "use a semantic colour token (bg-card, text-price, …)",
  },
  {
    id: "colour-function",
    re: /\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/g,
    hint: "use a semantic colour token, or add a palette step in styles/palette.css",
  },
  {
    id: "arbitrary-utility",
    // Tailwind arbitrary values: bg-[#fff], p-[13px], text-[10px], w-[420px]…
    re: /\b(?:bg|text|border|ring|shadow|fill|stroke|outline|decoration|from|via|to|p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|space-x|space-y|w|h|min-w|min-h|max-w|max-h|rounded|leading|tracking|inset|top|right|bottom|left)-\[/g,
    hint: "use a scale utility so --density and --radius can retune it",
  },
];

/**
 * Escape hatches. Each entry must say why. An eslint-style inline comment
 * `design-tokens-ignore-next-line -- reason` also suppresses one line.
 */
const IGNORE_LINE = /design-tokens-ignore-next-line/;

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (EXCLUDED_DIRS.has(entry)) continue;
      yield* walk(full);
    } else if (EXTENSIONS.has(entry.slice(entry.lastIndexOf(".")))) {
      yield full;
    }
  }
}

const violations = [];

for (const dir of SCAN_DIRS) {
  for (const file of walk(join(ROOT, dir))) {
    // Belt and braces: never flag generated shadcn primitives.
    if (relative(ROOT, file).split(sep).includes("ui")) continue;

    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      if (index > 0 && IGNORE_LINE.test(lines[index - 1])) return;
      for (const rule of RULES) {
        rule.re.lastIndex = 0;
        const match = rule.re.exec(line);
        if (match) {
          violations.push({
            file: relative(ROOT, file),
            line: index + 1,
            column: match.index + 1,
            match: match[0],
            rule: rule.id,
            hint: rule.hint,
          });
        }
      }
    });
  }
}

if (violations.length > 0) {
  console.error(
    `\n✗ ${violations.length} design-token violation(s) — literal values found in components:\n`,
  );
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}:${v.column}  ${v.rule}  "${v.match}"`);
    console.error(`      → ${v.hint}`);
  }
  console.error(
    "\n  Every visual value must come from a token so it can respond to a theme.",
  );
  console.error(
    "  Deliberate exception? Put `// design-tokens-ignore-next-line -- <reason>`",
  );
  console.error("  on the line above.\n");
  process.exit(1);
}

console.log("✓ design tokens: no literal colour or spacing values in components");

import { parse, wcagContrast } from "culori";

import type { ColorToken, ContrastPair } from "./tokens";

/**
 * Contrast verification for theme CSS.
 *
 * Themes are plain CSS files, so the only way to be *sure* a theme is
 * accessible is to read the CSS the browser reads and measure it. This module
 * parses a stylesheet, resolves `var()` chains down to literal colours, and
 * measures WCAG contrast. It is used by `tests/unit/contrast.test.ts` and by the
 * Foundations documentation.
 *
 * It is dev/test-only — nothing here ships to the browser.
 */

export type CssVars = Record<string, string>;

/**
 * Collect the custom-property declarations inside every rule whose selector
 * list contains `selector`.
 *
 * Deliberately a small hand-rolled parser rather than a CSS AST dependency:
 * theme files are a flat list of `--token: value;` declarations with no
 * nesting, and this keeps the test suite free of another parser to keep in step
 * with Tailwind.
 */
export function parseCssVars(css: string, selector: string): CssVars {
  const vars: CssVars = {};
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");

  // Walk top-level `selectorList { body }` rules.
  const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;

  while ((match = ruleRe.exec(withoutComments)) !== null) {
    const selectors = match[1].split(",").map((s) => s.trim());
    if (!selectors.includes(selector)) continue;

    const declRe = /(--[\w-]+)\s*:\s*([^;]+);/g;
    let decl: RegExpExecArray | null;
    while ((decl = declRe.exec(match[2])) !== null) {
      vars[decl[1]] = decl[2].trim();
    }
  }

  return vars;
}

/**
 * Resolve a value down to something `culori` can parse, following `var()`
 * references (including a fallback, `var(--x, blue)`) through `vars`.
 */
export function resolveVar(value: string, vars: CssVars, depth = 0): string {
  if (depth > 20) {
    throw new Error(`Circular var() reference while resolving "${value}"`);
  }

  const varMatch = value.match(/^var\(\s*(--[\w-]+)\s*(?:,\s*([\s\S]+))?\)$/);
  if (!varMatch) return value;

  const [, name, fallback] = varMatch;
  const referenced = vars[name];

  if (referenced === undefined) {
    if (fallback === undefined) {
      throw new Error(`Unknown custom property ${name}`);
    }
    return resolveVar(fallback.trim(), vars, depth + 1);
  }

  return resolveVar(referenced, vars, depth + 1);
}

/** Resolve a token to a colour string, or throw with a useful message. */
export function resolveToken(token: ColorToken, vars: CssVars): string {
  const raw = vars[`--${token}`];
  if (raw === undefined) {
    throw new Error(`Theme does not declare --${token}`);
  }
  return resolveVar(raw, vars);
}

export interface ContrastResult extends ContrastPair {
  ratio: number;
  passes: boolean;
  foregroundValue: string;
  backgroundValue: string;
}

/** Measure every pair. Returns results in the order given. */
export function measurePairs(
  vars: CssVars,
  pairs: readonly ContrastPair[],
): ContrastResult[] {
  return pairs.map((pair) => {
    const foregroundValue = resolveToken(pair.foreground, vars);
    const backgroundValue = resolveToken(pair.background, vars);

    const fg = parse(foregroundValue);
    const bg = parse(backgroundValue);

    if (!fg) throw new Error(`Cannot parse --${pair.foreground}: ${foregroundValue}`);
    if (!bg) throw new Error(`Cannot parse --${pair.background}: ${backgroundValue}`);

    const ratio = wcagContrast(fg, bg);

    return {
      ...pair,
      ratio,
      // Round to 2dp before comparing so a 4.4996 does not read as a pass in
      // the report while failing the assertion.
      passes: Math.round(ratio * 100) / 100 >= pair.min,
      foregroundValue,
      backgroundValue,
    };
  });
}

/** Only the failures, formatted for an assertion message. */
export function formatFailures(results: ContrastResult[]): string {
  return results
    .filter((r) => !r.passes)
    .map(
      (r) =>
        `  --${r.foreground} on --${r.background}: ${r.ratio.toFixed(2)}:1 ` +
        `(needs ${r.min}:1)\n` +
        `      fg ${r.foregroundValue}\n      bg ${r.backgroundValue}`,
    )
    .join("\n");
}

/** A readable matrix of every measured pair, for docs and debugging. */
export function formatMatrix(results: ContrastResult[]): string {
  return results
    .map(
      (r) =>
        `  ${r.passes ? "PASS" : "FAIL"}  ${r.ratio.toFixed(2).padStart(6)}:1 ` +
        `(min ${r.min})  --${r.foreground} on --${r.background}`,
    )
    .join("\n");
}

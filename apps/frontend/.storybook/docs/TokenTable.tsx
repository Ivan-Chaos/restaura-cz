import {
  CORE_COLOR_TOKENS,
  MENU_COLOR_TOKENS,
  OPTIONAL_TOKENS,
  SHADOW_TOKENS,
  SHAPE_TOKENS,
  TOKEN_PURPOSE,
  TYPOGRAPHY_TOKENS,
  type RequiredToken,
} from "../../lib/design-system/tokens";
import { CONTRAST_PAIRS } from "../../lib/design-system/tokens";
import { THEMES } from "../../lib/design-system/themes";

/**
 * Documentation helpers.
 *
 * Every table below is generated from `lib/design-system/tokens.ts` rather than
 * transcribed, so the documentation cannot drift from the catalogue the tests
 * enforce. Adding a token makes it appear here automatically.
 *
 * Swatches read `var(--token)` at render time, which means they show whatever
 * the toolbar's current theme × appearance resolves to — the docs are a live
 * view of the theme, not a screenshot of one.
 */

function Swatch({ token }: { token: string }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        inlineSize: "2.5rem",
        blockSize: "1.5rem",
        borderRadius: "var(--radius-sm)",
        background: `var(--${token})`,
        border: "1px solid var(--border)",
        verticalAlign: "middle",
      }}
    />
  );
}

function Row({ token }: { token: RequiredToken }) {
  return (
    <tr>
      <td style={{ whiteSpace: "nowrap" }}>
        <Swatch token={token} /> <code>--{token}</code>
      </td>
      <td>{TOKEN_PURPOSE[token]}</td>
    </tr>
  );
}

function Table({
  tokens,
  caption,
}: {
  tokens: readonly RequiredToken[];
  caption: string;
}) {
  return (
    <table>
      <caption style={{ textAlign: "start", paddingBlockEnd: "0.5rem" }}>
        {caption}
      </caption>
      <thead>
        <tr>
          <th scope="col">Token</th>
          <th scope="col">Purpose</th>
        </tr>
      </thead>
      <tbody>
        {tokens.map((token) => (
          <Row key={token} token={token} />
        ))}
      </tbody>
    </table>
  );
}

export const CoreColorTable = () => (
  <Table tokens={CORE_COLOR_TOKENS} caption="Core tokens (shared with shadcn)" />
);

export const MenuColorTable = () => (
  <Table tokens={MENU_COLOR_TOKENS} caption="Menu-domain tokens" />
);

export const NonColorTable = () => (
  <Table
    tokens={[...SHAPE_TOKENS, ...TYPOGRAPHY_TOKENS, ...SHADOW_TOKENS]}
    caption="Shape, typography and elevation"
  />
);

export const OptionalTokenList = () => (
  <ul>
    {OPTIONAL_TOKENS.map((token) => (
      <li key={token}>
        <code>--{token}</code>
      </li>
    ))}
  </ul>
);

export const ContrastContractTable = () => (
  <table>
    <thead>
      <tr>
        <th scope="col">Foreground</th>
        <th scope="col">on Background</th>
        <th scope="col">Minimum</th>
      </tr>
    </thead>
    <tbody>
      {CONTRAST_PAIRS.map((pair) => (
        <tr key={`${pair.foreground}-${pair.background}-${pair.min}`}>
          <td>
            <code>--{pair.foreground}</code>
          </td>
          <td>
            <code>--{pair.background}</code>
          </td>
          <td>{pair.min}:1</td>
        </tr>
      ))}
    </tbody>
  </table>
);

export const ThemeList = () => (
  <ul>
    {THEMES.map((theme) => (
      <li key={theme.id}>
        <code>{theme.id}</code>
        {theme.isDefault ? " — default (owns :root)" : ""} · display face:{" "}
        <code>{theme.fonts.display}</code>, body: <code>{theme.fonts.body}</code>
      </li>
    ))}
  </ul>
);

/** Type specimens in the theme's own faces, with Czech and German diacritics. */
export const TypeScale = () => (
  <div className="flex flex-col gap-4">
    {[
      { label: "Display / 3xl", className: "font-display text-3xl" },
      { label: "Display / 2xl", className: "font-display text-2xl" },
      { label: "Display / xl", className: "font-display text-xl" },
      { label: "Body / lg", className: "font-body text-lg" },
      { label: "Body / base", className: "font-body text-base" },
      { label: "Body / sm", className: "font-body text-sm" },
      { label: "Body / xs", className: "font-body text-xs" },
    ].map((spec) => (
      <div key={spec.label}>
        <div className="text-muted-foreground font-mono text-xs">{spec.label}</div>
        <div className={spec.className}>
          Svíčková na smetaně · Zwetschgenknödel · 189 Kč
        </div>
      </div>
    ))}
  </div>
);

/** The spacing rhythm, which scales with the active theme's `--density`. */
export const SpacingScale = () => (
  <div className="flex flex-col gap-2">
    {[1, 2, 3, 4, 6, 8].map((step) => (
      <div key={step} className="flex items-center gap-3">
        <code className="text-muted-foreground w-12 text-xs">{step}</code>
        <div
          className="bg-primary rounded-sm"
          style={{ blockSize: "0.75rem", inlineSize: `calc(var(--spacing) * ${step})` }}
        />
      </div>
    ))}
  </div>
);

export const RadiusScale = () => (
  <div className="flex flex-wrap gap-4">
    {["sm", "md", "lg", "xl", "2xl"].map((step) => (
      <div key={step} className="flex flex-col items-center gap-1">
        <div
          className="bg-secondary border-border border"
          style={{
            inlineSize: "4rem",
            blockSize: "3rem",
            borderRadius: `var(--radius-${step})`,
          }}
        />
        <code className="text-muted-foreground text-xs">--radius-{step}</code>
      </div>
    ))}
  </div>
);

export const ElevationScale = () => (
  <div className="flex flex-wrap gap-6 p-4">
    {SHADOW_TOKENS.map((token) => (
      <div key={token} className="flex flex-col items-center gap-2">
        <div
          className="bg-card"
          style={{
            inlineSize: "6rem",
            blockSize: "4rem",
            borderRadius: "var(--radius-lg)",
            boxShadow: `var(--${token})`,
          }}
        />
        <code className="text-muted-foreground text-xs">--{token}</code>
      </div>
    ))}
  </div>
);

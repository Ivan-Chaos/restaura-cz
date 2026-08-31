# Contract: `Landing` message namespace

Added to `messages/cs.json`, `messages/en.json`, `messages/de.json` in the same commit.
`HomePage` namespace is **removed** (its only consumer is replaced). `scripts/check-messages.mjs`
enforces parity. `en.json` is the type source.

Copy guidance: research R10. Lengths below are guidance for German fit, not hard limits.

```jsonc
"Landing": {
  "meta":   { "title": "…", "description": "…" },
  "brand":  { "name": "Restaura", "wordmarkLabel": "Restaura — home" },
  "header": { "signIn": "…" /* reserved, unused until sign-in exists — omit if unused */ },
  "hero": {
    "headline": "…",            // ≤ 6 words
    "subheadline": "…",         // ≤ 14 words
    "cta": "Start for free",
    "scrollHint": "…"           // visually hidden / small caption, optional
  },
  "capabilities": {
    "sectionTitle": "…",        // visually hidden h2 grouping, if used
    "digitalMenu": { "eyebrow": "…", "title": "…", "body": "…", "demo": "See a live menu" },
    "pdf":         { "eyebrow": "…", "title": "…", "body": "…" },
    "qr":          { "eyebrow": "…", "title": "…", "body": "…" }
  },
  "steps": {
    "title": "…",
    "create":   { "title": "…", "body": "…" },
    "generate": { "title": "…", "body": "…" },
    "scan":     { "title": "…", "body": "…" }
  },
  "pricing": {
    "title": "…",
    "subtitle": "…",
    "comingSoon": "Coming soon",
    "recommended": "Recommended",
    "perMonth": "{price}/month",  // price is pre-formatted by formatMoney
    "free": "Free",
    "noPriceYet": "Coming soon",  // Pro Plus price line
    "ctaSignup": "Start for free",
    "ctaNotify": "Notify me"
  },
  "plans": {
    "free":    { "name": "Free",     "tagline": "…",
                 "features": { "oneMenu": "1 menu", "thirtyItems": "Up to 30 items",
                               "brandedPdf": "PDF export with Restaura branding",
                               "brandedQr": "Table QR codes with Restaura branding" } },
    "pro":     { "name": "Pro",      "tagline": "…",
                 "features": { "fiveMenus": "5 menus", "unlimitedItems": "Unlimited items",
                               "noBranding": "No Restaura branding" } },
    "proPlus": { "name": "Pro Plus", "tagline": "…",
                 "features": { "menuParsing": "Import an existing menu automatically",
                               "unlimitedMenus": "Unlimited menus",
                               "unlimitedSize": "Unlimited menu size",
                               "timeMenus": "Time-based menus (morning, evening)",
                               "qrCodes": "Table QR codes",
                               "pdfTemplates": "PDF export, unlimited templates" } }
  },
  "cta": {
    "mailSubjectSignup": "…",
    "mailSubjectNotify": "… {plan}"
  },
  "assets": {
    "hero":        { "alt": "…" },
    "digitalMenu": { "alt": "…" },
    "pdf":         { "alt": "…" },
    "qr":          { "alt": "…" },
    "og":          { "alt": "…" }
  },
  "footer": {
    "tagline": "…",
    "legal": "Legal",
    "privacy": "Privacy",
    "contact": "Contact",
    "copyright": "© {year} Restaura"
  }
}
```

Rules
- Every key exists in all three files (gate).
- Plan feature strings must state the spec numbers literally (1, 30, 5, 129).
- "Coming soon" must appear as text on Pro and Pro Plus (FR-016 — not colour alone).
- Alt texts describe the scene for a screen-reader user; they are not marketing copy.
- No key may be interpolated with raw HTML; use `t.rich` if emphasis is needed.

# Feature Specification: Menu Visual Variants

**Feature Branch**: `005-menu-visual-variants`

**Created**: 2026-09-03

**Status**: Draft

**Input**: User description: "We need more menu variants, right now we need 4 more: plain white, liquid glass, green bar, modern, and refined. Before you start implementing these consult with existing references and see how other menus look like(fetch inspo basically)."

## Product Context

Today every published menu looks the same. The editor already shows a "Visual style" picker, but only the single default style ("Classic", the warm restaurant look) can be chosen; the other slots are disabled placeholders labelled "Coming soon". The menu record already stores the chosen style, and the guest page ignores it and always renders Classic.

This feature turns the picker into a real choice. It adds five new guest-facing styles alongside Classic, lets the owner pick one, and makes the published menu render in the chosen style. It does not change what a menu contains, only how it looks.

### Style Catalogue

Each style is a complete, self-contained look: colours, type, corner shape, spacing rhythm, surface treatment, and elevation. Every style must present the same content (menu name, sections, dishes, descriptions, prices, dietary markers, availability, highlights, photos where present) with nothing hidden or added. The design direction below was assembled from a review of current digital-menu references (QR menu template galleries, fine-dining menu typography guides, 2026 menu design trend round-ups, and Apple's Liquid Glass design language and its web adaptations).

| Style | Owner-facing name | Direction | Reference cues | Venue fit |
|-------|-------------------|-----------|----------------|-----------|
| `classic` (existing) | Classic | Warm parchment surfaces, serif display type, terracotta accent, wine-coloured prices. Unchanged. | Existing default | General restaurant |
| `plain-white` | Plain White | Stark, quiet, near-monochrome. Pure white ground, black text, one restrained accent used only for prices and highlights. Single sans-serif family, square-ish corners, hairline dividers, no card surfaces or shadows. Dark appearance is the mirror: near-black ground, white text. | "Clean Minimal" QR menu archetype: light background, one accent, generous white space, no textures | Cafés, coffee shops, small focused menus |
| `liquid-glass` | Liquid Glass | Translucent frosted panels floating over a soft, slowly shifting ambient colour field. Panels have a thin light edge, soft inner highlight, large radii, and layered depth. Type is a clean sans-serif. Motion is subtle and only on entrance and hover. | Apple Liquid Glass (WWDC 2025) and its web adaptations: frosted blur, semi-transparent surfaces, thin translucent borders, layered shadows, specular highlights | Modern bars, cocktail lounges, trend-forward venues |
| `green-bar` | Green Bar | Deep bottle-green ground with cream text and a brass or amber accent. Bold, heavy display type sized for dim lighting; compact rows; strong contrast; prices in the accent colour. Dark appearance deepens the green further rather than switching to grey. | "Dark Green Bar Menu" template family and the "Dark Mode for bars and nightlife" archetype: deep ground, warm light text, amber or copper accent, larger type for low light | Pubs, bars, taprooms, beer gardens |
| `modern` | Modern | Confident, editorial, high-contrast. Bright neutral ground, heavyweight geometric sans-serif headings, clear size hierarchy, generous spacing, bold section labels, dietary icons, photos treated as large hero images when present. | 2026 modern menu trend cues: heavyweight type "with clear soul", uncluttered grid, strong hierarchy, selective hero photography, icon-based dietary markers | Fast-casual, bistros, contemporary restaurants |
| `refined` | Refined | Fine-dining restraint. Ivory or cream ground (never clinical white), elegant high-contrast serif for names, refined sans-serif for descriptions, wide margins, single hairline rules as the only decoration, no shadows or gradients, prices shown quietly without currency emphasis. Photos, if present, are small and understated. | Fine-dining menu design guidance: two typefaces maximum, ivory paper, generous white space, hairline rules only, minimal photography, price de-emphasis | Fine dining, tasting menus, wine bars |

The "Slate" look that exists today as an internal design-system demonstration is **not** part of this catalogue and is not offered to owners.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Owner Picks a Visual Style (Priority: P1)

A signed-in restaurant owner opens a menu in the editor, sees the "Visual style" picker listing all six styles by name, selects one, and the selection is saved. Returning to the editor later shows the same selection.

**Why this priority**: Without a working picker nothing else in this feature is reachable. It also converts an existing "coming soon" promise into a delivered capability.

**Independent Test**: Sign in, open a menu, select "Green Bar", reload the editor, confirm "Green Bar" is still selected. Delivers a persisted preference even before the guest page changes.

**Acceptance Scenarios**:

1. **Given** an owner editing any menu, **When** they view the Visual style picker, **Then** all six styles are listed by their localized display names, none are disabled or marked "coming soon", and the current style is shown as selected.
2. **Given** an owner editing a menu, **When** they select a different style, **Then** the change is saved, they see a success confirmation consistent with other editor saves, and the picker shows the new selection.
3. **Given** an owner who changed a menu's style, **When** they leave and come back to the editor, **Then** the previously chosen style is still selected.
4. **Given** a menu belonging to owner A, **When** owner B or an anonymous party attempts to change its style, **Then** the change is refused.
5. **Given** an owner editing a menu, **When** a style change is attempted with a value that is not in the catalogue, **Then** it is rejected with a validation message and the stored style is unchanged.
6. **Given** a menu created before this feature, **When** the owner opens it in the editor, **Then** it shows Classic as selected and behaves like any other menu.

---

### User Story 2 - Guests See the Menu in the Chosen Style (Priority: P1)

A guest opens a published menu's public address and sees it rendered in the style the owner chose. All menu content is present and legible in every style, on a phone, in both light and dark appearance.

**Why this priority**: This is the actual value of the feature. The picker is only meaningful if guests see the result. It is P1 alongside Story 1 because neither delivers value alone.

**Independent Test**: Publish a filled sample menu, switch it through each of the six styles, and open the public address after each switch in a fresh browser session on a 360px-wide viewport in both appearances. Confirm the look changes and every dish, price, marker, and photo is present each time.

**Acceptance Scenarios**:

1. **Given** a published menu with style "Refined", **When** a guest opens its public address, **Then** the menu is rendered in the Refined look.
2. **Given** a published menu, **When** the owner changes its style and saves, **Then** the very next guest request to the public address shows the new style, with no stale look served.
3. **Given** the same menu rendered in each of the six styles, **When** the rendered content is compared, **Then** the set of sections, dishes, descriptions, prices, dietary markers, availability states, highlights, and photos is identical across all six; only presentation differs.
4. **Given** any style viewed on a 360px-wide phone, **When** the guest scrolls the menu, **Then** all text is legible without zooming and there is no horizontal page scroll.
5. **Given** any style, **When** the guest's device prefers dark appearance, **Then** the menu renders in that style's dark appearance, keeping the style's character.
6. **Given** any style, **When** text and interactive elements are measured against their backgrounds, **Then** they meet WCAG 2.1 AA contrast (4.5:1 body text, 3:1 large text and control boundaries) in both appearances.
7. **Given** the Liquid Glass style, **When** the guest's browser cannot render translucency and blur, or the guest has asked for reduced transparency, **Then** panels fall back to solid surfaces and the menu remains fully readable and recognisably the same style.
8. **Given** the Liquid Glass style, **When** the guest has asked for reduced motion, **Then** the ambient background does not animate and entrance motion is disabled.

---

### User Story 3 - Owner Previews Styles Before Choosing (Priority: P2)

While choosing a style, the owner can see what each style looks like, both as a small representative swatch in the picker and as a full preview of their own menu in that style, so they can choose with confidence rather than by name alone.

**Why this priority**: Names such as "Refined" or "Liquid Glass" do not communicate a look. Choosing blind leads to trial and error against the live published menu. This story is independent of Stories 1 and 2 and can ship after them.

**Independent Test**: Open the picker, confirm each option shows a visual swatch that matches the style's direction, open a preview for a style, and confirm the owner's own menu content renders in that style without changing the saved selection.

**Acceptance Scenarios**:

1. **Given** the Visual style picker, **When** the owner views the options, **Then** each option shows its display name, a one-line localized description, and a small visual swatch representative of the style (ground colour, accent, type feel).
2. **Given** an owner editing a menu, **When** they preview a style that is not the saved one, **Then** they see their menu rendered in that style and the saved selection is unchanged until they explicitly choose it.
3. **Given** an unpublished menu, **When** the owner previews any style, **Then** the preview works even though the public address is not yet available.

---

### User Story 4 - Prospective Customers Browse the Styles (Priority: P3)

A visitor to the marketing site can open a sample menu in each style to see what the product offers before signing up.

**Why this priority**: The styles are a selling point. Showing them publicly supports acquisition, but it is not needed for existing owners to get value.

**Independent Test**: From the marketing site, reach a sample menu for each of the six styles at a stable address and confirm each renders in its style in both appearances.

**Acceptance Scenarios**:

1. **Given** a visitor with no account, **When** they follow the sample-menu link for a given style, **Then** they see the full sample menu rendered in that style.
2. **Given** the sample menu in any style, **When** its address is opened directly, **Then** it renders without requiring sign-in and with page metadata naming the sample menu, not the platform.

---

### Edge Cases

- A menu's stored style refers to something no longer in the catalogue (for example, a style is retired later). The guest page and editor treat it as Classic and the editor shows Classic as selected.
- The owner changes style on a published menu while guests have it open. Guests see the new style on their next load; nothing breaks mid-session.
- A menu has very long dish names or descriptions, or German-length words. Every style wraps text gracefully with no overflow or clipping.
- A menu has no photos at all, or every dish has a photo. Photo-forward treatments (Modern) and photo-quiet treatments (Refined) both degrade sensibly to either extreme.
- A menu has 50 or more dishes in the Liquid Glass style. Scrolling stays smooth on a mid-tier phone; the ambient effect must not make a long menu sluggish.
- The Liquid Glass ambient background sits behind text-bearing panels. Contrast requirements must hold for every colour the ambient field can take, not just its average.
- Plain White in dark appearance and Green Bar in light appearance still read as "their" style rather than collapsing into a generic look.
- Sold-out dishes, chef's-pick highlights, and "from" prices remain visibly distinguished in every style, not only in Classic.
- The owner dashboard remains light-toned regardless of the menu style being edited; the style applies to the guest rendering and to previews only.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST offer exactly six visual styles to owners: Classic, Plain White, Liquid Glass, Green Bar, Modern, and Refined.
- **FR-002**: Each style MUST have a stable identifier, a localized display name, and a localized one-line description in all supported languages (Czech, English, German).
- **FR-003**: The Visual style picker in the menu editor MUST list every style as selectable, with no disabled or "coming soon" entries, and MUST indicate the currently saved style.
- **FR-004**: Owners MUST be able to change a menu's style, and the change MUST be persisted with the menu.
- **FR-005**: Only the menu's owner MAY change its style; any other party's attempt MUST be refused.
- **FR-006**: The system MUST reject a style value that is not in the catalogue and MUST leave the stored style unchanged.
- **FR-007**: Menus created before this feature, and menus whose stored style is not in the catalogue, MUST be treated as Classic everywhere.
- **FR-008**: The public menu page MUST render a published menu in its saved style, and a saved style change MUST be reflected on the next guest request.
- **FR-009**: Every style MUST render the complete menu content with no omissions: name, sections in order, dishes, descriptions, prices (including "from" and multi-size prices), dietary markers with text labels, availability state, highlights, and photos where present.
- **FR-010**: Every style MUST provide a coherent light appearance and dark appearance, and MUST follow the guest's appearance preference.
- **FR-011**: Every style MUST meet WCAG 2.1 AA contrast in both appearances for all text-on-surface pairs, prices, muted text, control boundaries, and focus indicators.
- **FR-012**: Every style MUST be legible and free of horizontal page scroll on viewports from 320px to 1920px wide.
- **FR-013**: Every style MUST visibly distinguish unavailable dishes and highlighted dishes and MUST communicate these states in words, not colour alone.
- **FR-014**: The Liquid Glass style MUST provide a solid-surface fallback when translucency cannot be rendered or when the guest prefers reduced transparency, and MUST disable ambient and entrance motion when the guest prefers reduced motion.
- **FR-015**: Applying a style MUST NOT require any change to the menu's content or structure, and switching between styles MUST be lossless and reversible.
- **FR-016**: The picker MUST show a representative visual swatch and description for each style so the owner can choose without opening the guest page.
- **FR-017**: Owners MUST be able to preview their own menu in any style without changing the saved selection, including for unpublished menus.
- **FR-018**: A public sample menu MUST be reachable in each of the six styles at a stable address without sign-in.
- **FR-019**: All owner-facing and guest-facing text introduced by this feature MUST be localized in Czech, English, and German.
- **FR-020**: The owner dashboard MUST keep its fixed light appearance; menu styles apply only to guest rendering and previews.
- **FR-021** *(added 2026-09-03 after review)*: Each non-default style MUST differ from Classic in **structure**, not only in colour and type: at least three of the five composition axes (header layout, navigation shape, section heading treatment, dish layout, price treatment) MUST be distinct. Liquid Glass MUST render translucent card and bar elements over its ambient field; Green Bar a band masthead with bar-style section headings and prominent prices; Modern an editorial layout with oversized numbered sections and flat tiles; Refined a centred masthead with roman-numeral sections and prices set beneath the dish; Plain White a hairline ledger with right-aligned prices.

### Performance Requirements

- **PR-001**: The public menu page in any style MUST meet the existing guest-page budgets on a mid-tier mobile device over 4G on a production build: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1.
- **PR-002**: Adding the five styles MUST NOT increase the guest page's initial client JavaScript; styling is delivered as presentation, not behaviour.
- **PR-003**: The Liquid Glass style MUST keep scrolling at a stable frame rate on a menu of 50 dishes on a mid-tier phone; blur and translucency MUST be bounded to a small number of panel surfaces, never applied per dish row.
- **PR-004**: Any additional font faces introduced for a style MUST be loaded in a way that does not block first paint and MUST fall back to a system face until loaded.

### Key Entities

- **Visual Style**: A catalogue entry describing one complete look. Attributes: stable identifier, localized display name, localized description, representative swatch, and the full set of presentation values for light and dark appearance. Six exist; the catalogue is the single source of truth for what the picker offers and what the guest page can render.
- **Menu**: An owner's menu. Gains no new attributes; its existing "visual style" attribute now accepts any catalogue identifier rather than only the default. Every menu references exactly one style; a reference outside the catalogue resolves to Classic.
- **Sample Menu**: The fixed demonstration menu used by the marketing site, tests, and previews. Rendered in each style at a stable public address.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An owner can change a menu's visual style and confirm it on the public page in under 60 seconds end to end.
- **SC-002**: 100% of the six styles pass automated contrast checks for every required colour pair in both appearances, with zero waivers.
- **SC-003**: For the sample menu, the rendered content (dish names, prices, markers, availability text) is identical across all six styles; an automated comparison finds zero content differences.
- **SC-004**: The public menu page in every style meets LCP ≤ 2.5 s, INP ≤ 200 ms, and CLS ≤ 0.1 on the reference mobile profile, with no regression against the current Classic-only page.
- **SC-005**: Guest page initial client JavaScript is unchanged, within measurement noise, after adding the five styles.
- **SC-006**: In a usability check with at least 5 owners, at least 4 correctly identify the style they want from the picker's swatch and description without opening a preview.
- **SC-007**: Zero accessibility violations are reported by automated checks on the guest menu in each style, in both appearances, in all three languages.
- **SC-008**: 100% of pre-existing menus continue to render and edit without error after the change, showing Classic.

## Assumptions

- The description says "4 more" but names five styles. This spec covers all five named styles (Plain White, Liquid Glass, Green Bar, Modern, Refined); if only four were intended, one is to be dropped at clarification time and the rest of the spec is unaffected.
- "Green bar" is read as the bar-and-pub menu archetype in deep green (dark green ground, bold high-legibility type, brass or amber accent, built for dim lighting), matching the well-known "dark green bar menu" template family. It is not read as a thin green header bar on an otherwise neutral menu.
- "Plain white" in dark appearance is a plain near-black with the same restraint; the style's identity is "monochrome and quiet", not literally white.
- The existing default style keeps its stored identifier and its "Classic" display name; no data migration is needed for existing menus.
- The existing internal "Slate" look remains a design-system test fixture and is not exposed to owners.
- Styles are chosen per menu, not per restaurant; an owner with several menus may give each a different style.
- No per-style customisation (custom colours, uploaded fonts, logos) is in scope. That is a separate future feature.
- Photo treatments differ by style, but photo upload and storage are unchanged by this feature.
- Every style continues to honour the platform's existing rules: all visible text is localized, visual values derive from the design-token system, and both appearances are supported.
- The three locales already supported (Czech, English, German) are the full set for this feature.

# Feature Specification: Digital Menu Design System

**Feature Branch**: `001-menu-design-system`

**Created**: 2026-08-29

**Status**: Draft

**Input**: User description: "Create a design system(components, primites, reusables etc) for a digital menu service. Focus on warm tones and restaurant/food establishment feel. Be mindful of the fact that menus in the future will support multiple themes and styling, keep that in mind"

**Refinement (2026-08-29)**: "Right now we are not doing orders, we will have menus only — restaurants put up a menu and you can open it via a link. But since we are working with a design system, add ordering-related components in, since ordering is being considered for later revisions."

## Product Context

The service in this phase is **menus only**: a restaurant publishes a menu and guests open it through a shareable link (typically a QR code at the table, a link on the restaurant's website, or a link in a social profile). There is no ordering, cart, payment, or table service. The design system nevertheless includes the building blocks an ordering experience would need, so that a later revision can add ordering without introducing a second visual language.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Guest Browses a Warm, Legible Menu (Priority: P1)

A restaurant guest opens a digital menu on their phone via a shared link (typically by scanning a QR code at the table or tapping a link on the restaurant's website) and browses categories, dishes, prices, and dietary information. The menu feels like it belongs to a food establishment: warm, inviting colors, appetizing typography, clear pricing, and easy scanning on a small screen in both bright and dim environments.

**Why this priority**: The guest-facing menu is the core product. Every other part of the design system exists to make this experience consistent and fast to build. Without a coherent, warm, readable set of menu building blocks there is no product to ship.

**Independent Test**: Assemble a sample menu (3 categories, ~12 dishes with prices, allergen/dietary markers, one unavailable dish, one dish with a photo, one without) exclusively from design-system pieces and confirm a tester can find a specific dish and its price in under 10 seconds on a 360px-wide screen in both light and dark appearance.

**Acceptance Scenarios**:

1. **Given** a sample menu built from the design system, **When** a guest views it on a 360px-wide phone, **Then** category headings, dish names, descriptions, and prices are readable without zooming, no content is cut off, and there is no horizontal scrolling.
2. **Given** a dish with dietary/allergen attributes (e.g. vegetarian, gluten-free, contains nuts), **When** the guest views the dish, **Then** each attribute is shown as a recognizable marker with an accessible text label, not color alone.
3. **Given** a dish marked as currently unavailable (sold out), **When** the guest views it, **Then** it is visibly distinguished from available dishes and communicates its status in words.
4. **Given** the guest's device prefers dark appearance, **When** the menu loads, **Then** every design-system element renders in a dark variant that keeps the same warm character and meets contrast requirements.
5. **Given** a dish with a price, a "from" price, or a set of size/variant prices, **When** displayed, **Then** the price presentation is consistent across all dishes and formatted for the active locale and currency.

---

### User Story 2 - Restaurant Applies Its Own Look Without Rebuilding Components (Priority: P2)

A restaurant owner (or the service operator on their behalf) wants their menu to reflect their brand — a rustic trattoria, a modern café, a fine-dining venue. They select or configure a theme (colors, typography flavor, corner roundness, density) and every menu component adopts it automatically. The default theme is the warm "restaurant" look; alternative themes must be possible without changing the components themselves.

**Why this priority**: Multi-theme support is an explicit future requirement. Designing the token/theme boundary now is far cheaper than retrofitting it. It is P2 because the first release ships one theme, but the architecture decision must be validated now.

**Independent Test**: Define a second, deliberately different theme (e.g. cool/minimal) using only theme values — no component changes — apply it to the sample menu from Story 1, and confirm every component visibly changes accordingly and remains accessible.

**Acceptance Scenarios**:

1. **Given** the sample menu rendered with the default warm theme, **When** an alternative theme is applied, **Then** all colors, typography, radii, and spacing scale change consistently across every component with zero component-level edits.
2. **Given** any theme, **When** contrast is measured for text on its backgrounds and for interactive states, **Then** it meets WCAG 2.1 AA (4.5:1 body text, 3:1 large text and UI boundaries).
3. **Given** a theme, **When** the guest toggles between light and dark appearance, **Then** the theme has a coherent variant for both, and the switch happens without layout shift.
4. **Given** a theme author, **When** they define a new theme, **Then** the set of values they must provide is documented, finite, and named by purpose (e.g. "surface", "accent", "price") rather than by literal color.

---

### User Story 3 - Developer Discovers and Reuses Components via Living Documentation (Priority: P3)

A developer building a new menu screen opens the design-system documentation, browses every primitive and composite component with its variants, states, and theme previews, and copies the intended usage. They can see each component in every theme and both appearances side by side, and they never need to invent a one-off style.

**Why this priority**: Documentation is what makes the system a *system* rather than a folder of components. It enforces reuse (a constitution principle) and shortens onboarding. It is P3 because it delivers no direct guest value, but it is required for the system to be maintained.

**Independent Test**: A developer unfamiliar with the codebase is asked to build a "daily specials" section using only the documentation; they complete it without creating any new colors, spacing values, or components.

**Acceptance Scenarios**:

1. **Given** the documentation, **When** a developer opens any component entry, **Then** they see every variant and interaction state (default, hover, focus, active, disabled, loading, error where applicable) rendered live.
2. **Given** the documentation, **When** a developer switches theme or appearance in a global control, **Then** every displayed component updates accordingly.
3. **Given** the documentation, **When** a developer views the foundations section, **Then** the full color palette, type scale, spacing scale, radii, shadows, and motion durations are listed with their purpose-based names and example usage.
4. **Given** a component with accessibility requirements (e.g. dialog, tabs), **When** it is viewed in the documentation, **Then** keyboard interaction and screen-reader behavior are described and demonstrable.

---

### User Story 4 - Staff Manages Menu Content With the Same Visual Language (Priority: P4)

Restaurant staff use administrative screens (editing dishes, toggling availability, reordering categories) that share the same warm design language, so the product feels unified. These screens need form controls, feedback, and data-display components beyond what the guest menu uses.

**Why this priority**: Management screens are a later product phase, but the design system must include the form and feedback primitives so those screens do not spawn a second, inconsistent component set.

**Independent Test**: Build a "edit dish" form (name, description, price, category, dietary markers, availability toggle, image) from design-system components only and confirm all validation, loading, success, and error states are covered.

**Acceptance Scenarios**:

1. **Given** a form built from the design system, **When** a required field is left empty and submitted, **Then** the field shows an error state and message consistent with every other form in the system.
2. **Given** a form submission in progress, **When** the user waits, **Then** a consistent loading indicator appears and repeat submission is prevented.
3. **Given** a successful or failed action, **When** it completes, **Then** a consistent, dismissible notification informs the user.

---

### User Story 5 - Ordering Building Blocks Exist Before Ordering Does (Priority: P5)

A future revision adds guest ordering (select dishes, choose quantities and options, review a summary, submit). The design system already contains the components that flow would need — rendered, themed, documented, and accessible — so that when ordering is built, no new visual primitives or tokens have to be invented and the ordering experience feels like a natural extension of the menu.

**Why this priority**: The service is menus-only today, so these components deliver no immediate guest value and are lowest priority. They are included now because designing them alongside the menu components is cheaper and yields a more coherent system than bolting them on later. They are validated only in documentation, never wired into a live flow.

**Independent Test**: Assemble a mock "review your selection" screen in the documentation (dish rows with quantities and option choices, a running total, a sticky call-to-action bar, a stepper showing progress) from design-system components only, and confirm it renders in every theme and appearance and passes the same accessibility checks as the menu.

**Acceptance Scenarios**:

1. **Given** the documentation, **When** a developer browses the ordering components group, **Then** every component listed in FR-014b is rendered with its variants and states in all themes and both appearances.
2. **Given** a dish card, **When** an "add/select" affordance is enabled on it, **Then** the card accommodates the affordance without layout change to the non-ordering variant, and the affordance is keyboard operable.
3. **Given** a quantity control, **When** the guest reaches the minimum or maximum allowed value, **Then** the corresponding direction is disabled and the state is communicated to assistive technology.
4. **Given** a mock summary screen with several line items and a total, **When** viewed at 320px, **Then** all line items, quantities, prices, and the total are readable and the primary call-to-action remains reachable without scrolling past it.

---

### Edge Cases

- Very long dish names or descriptions (e.g. 120+ characters, no spaces) must wrap or truncate gracefully without breaking layout.
- Dishes with no image must not leave an awkward empty block; the layout adapts.
- Dishes with no price (e.g. "market price"), zero price, or multiple variant prices must all render consistently.
- Menus with a single category or a single dish must not look broken or empty.
- Text expands in translation (German averages ~30% longer than English); components must tolerate this at every breakpoint from 320px to 1920px.
- Right-to-left languages are not in scope but layouts must not hard-code left/right in a way that prevents future support.
- Users with reduced-motion preference must see no non-essential animation.
- Users with forced high-contrast modes or large system font sizes (up to 200%) must still be able to read and operate the menu.
- Theme values that fail contrast (e.g. a restaurant supplies a poor accent color) must be detectable; the system must define how this is surfaced to the theme author.
- Fully keyboard-only or screen-reader-only navigation must reach every interactive element with a visible focus indicator.

## Requirements *(mandatory)*

### Functional Requirements

**Foundations (design tokens)**

- **FR-001**: The system MUST define a finite, named set of design tokens covering color, typography (families, sizes, weights, line heights), spacing, border radii, shadows/elevation, and motion (durations, easing). Every component MUST derive its appearance exclusively from these tokens; literal color, spacing, or size values inside components are forbidden.
- **FR-002**: Tokens MUST be named by purpose/role (e.g. surface, surface-raised, text-primary, text-muted, accent, accent-foreground, price, warning, success, danger, border, focus-ring) rather than by literal appearance, so themes can reassign them.
- **FR-003**: The default theme MUST use a warm palette evoking restaurant/food establishments (e.g. cream/parchment surfaces, terracotta/burnt-orange/deep-red accents, olive/herb greens for positive states, warm charcoal text) with a typography pairing that reads as hospitable (a display face for headings, a highly legible face for body/prices).
- **FR-004**: Every token set MUST provide both a light and a dark appearance variant; the dark variant MUST preserve the warm character (warm dark browns/charcoals, not neutral gray/black).
- **FR-005**: All token combinations used for text and interactive boundaries MUST meet WCAG 2.1 AA contrast in both appearances.

**Theming**

- **FR-006**: The system MUST support multiple themes, where a theme is a complete assignment of values to the token set. Switching theme MUST require no component code changes.
- **FR-007**: The system MUST ship with the default warm theme and MUST demonstrate theme-ability with at least one additional, visually distinct example theme used for validation and documentation.
- **FR-008**: Themes MUST be scoped so that a guest-facing menu can render in a restaurant's theme while surrounding service chrome (if any) renders in the default theme, i.e. a theme MUST be applicable to a subtree, not only globally.
- **FR-009**: Theme and appearance (light/dark) MUST be independent axes: any theme × any appearance is valid.
- **FR-010**: The system MUST document the contract a theme author fulfils (required tokens, optional tokens, constraints) and MUST provide a way to verify a theme meets contrast requirements.

**Primitive components**

- **FR-011**: The system MUST provide these foundational primitives, each with documented variants and states: Button (primary, secondary, ghost, destructive; sizes; loading; disabled; icon-only), Badge/Tag, Card, Separator, Avatar/Logo placeholder, Skeleton (loading placeholder), Tooltip, Dialog/Modal, Drawer/Sheet (bottom sheet on mobile), Tabs, Accordion, Toast/Notification, Input, Textarea, Select, Checkbox, Radio group, Switch/Toggle, Label with helper/error text, Form field wrapper, Scroll area, and Empty state.
- **FR-012**: Every primitive MUST be fully keyboard operable with a visible focus indicator and correct semantics/roles for assistive technology.
- **FR-013**: Every primitive MUST render correctly in every theme and both appearances without per-theme code.

**Menu-domain components**

- **FR-014**: The system MUST provide menu-specific composite components built from the primitives and tokens: Menu header (establishment name, logo, tagline, opening hours slot), Category navigation (horizontally scrollable on mobile, with active-state indication), Category section heading, Dish/Menu item card (image optional, name, description, price, dietary markers, availability status, optional "chef's pick"/"new"/"spicy" highlight), Dish list row (compact variant without image), Price display (single price, "from" price, variant price list, market price), Dietary/allergen marker set (icon + accessible label, with a legend component), Availability indicator (available / sold out / limited), Featured/specials strip, Menu footer (contact, address, service notes), and Language switcher.
- **FR-014a**: The system MUST provide a Shareable-link entry experience: a Menu landing/cover component (establishment identity, "view menu" call-to-action, optional welcome note) and a Share affordance (copy link / QR display slot) suitable for restaurants distributing their menu via link or QR code.
- **FR-014b**: The system MUST provide ordering-oriented components, documented and themed but NOT connected to any live ordering flow in this phase: Quantity stepper (min/max aware), Selectable dish card / row variant (add/select affordance), Option group (single- and multi-choice modifiers such as size, side, extras, with per-option price deltas), Line item row (name, chosen options, quantity, line price), Order summary (line items, subtotal, optional service/tip/fee rows, total), Sticky action bar (persistent bottom call-to-action with a summary such as item count and total), Progress stepper (multi-step flow indicator), Numeric/currency input, Note/special-request field, and Order status indicator (e.g. received, preparing, ready).
- **FR-014c**: Ordering-oriented components MUST reuse the menu components' tokens, price display, and dietary markers so that a dish looks identical whether it is browsed or selected; no ordering component MAY introduce a visual style absent from the menu components.
- **FR-015**: The Dish card and list row MUST handle missing image, missing description, missing price, and long text without layout breakage.
- **FR-016**: Dietary/allergen markers MUST never rely on color alone; each MUST have a text label available visually or to assistive technology and MUST be listed in a legend component.
- **FR-017**: Menu-domain components MUST accept all user-visible text (labels, statuses) from the application's translation mechanism; they MUST NOT hard-code display strings.

**Layout & responsiveness**

- **FR-018**: The system MUST provide layout primitives (Container, Stack, Grid/Responsive columns, Section) that make menu pages responsive from 320px to 1920px with no horizontal page scroll.
- **FR-019**: Components MUST tolerate text length variation across the supported locales (Czech, English, German) without truncating meaning or overflowing.
- **FR-020**: Non-essential motion MUST be disabled when the user prefers reduced motion; essential state changes MUST remain perceivable without motion.

**Documentation**

- **FR-021**: The system MUST include living, browsable documentation where every token, primitive, and menu component is rendered live with all variants and states.
- **FR-022**: The documentation MUST offer global controls to switch theme and appearance and MUST show at least the default theme and the example alternative theme.
- **FR-023**: The documentation MUST include usage guidance for each component (when to use, when not to, accessibility notes) and a foundations section presenting the full token catalogue.
- **FR-024**: The documentation MUST include at least one full composed example — a complete sample restaurant menu page — assembled entirely from the system, viewable in every theme and appearance.

**Quality**

- **FR-025**: Every interactive component MUST have automated tests covering rendering, user interaction, and accessibility roles; the composed sample menu MUST have an automated visual/behavioral check in both appearances and in at least two themes.
- **FR-026**: Adding a new component MUST not require adding new token values; if it does, the token addition MUST be made at the foundations level and propagated to all themes in the same change.

### Key Entities

- **Design Token**: A named, purpose-based value (color, size, duration, etc.) that components reference instead of literals. Has a role name, a category, and a value per theme × appearance.
- **Theme**: A complete assignment of values to every token, with a light and a dark appearance variant, an identifier, and a display name. The default theme is the warm restaurant theme. Themes are applicable globally or to a subtree.
- **Appearance**: The light/dark axis, independent of theme; typically follows the guest's device preference.
- **Primitive Component**: A generic, domain-agnostic building block (button, input, card…) with defined variants and states, styled only via tokens.
- **Menu Component**: A domain-specific composite (dish card, price display, dietary marker…) built from primitives and tokens, representing menu concepts.
- **Menu Item (display model)**: The information a dish component presents — name, description, price(s), image, dietary/allergen attributes, availability status, highlight flags. Defined here only as the shape components consume; persistence is out of scope.
- **Menu Link**: The shareable address through which a guest reaches a restaurant's published menu (link or QR code). In this phase it is the only entry point to the guest experience.
- **Order Line Item (display model, future-facing)**: The information ordering components present — a menu item, chosen option values with price deltas, a quantity, and a computed line price. Defined only as the shape components consume; no ordering behavior exists in this phase.
- **Option Group (display model, future-facing)**: A named set of modifiers for a dish (e.g. size, sides, extras) with single- or multi-choice semantics, min/max selections, and per-option price deltas.
- **Dietary/Allergen Attribute**: A recognized marker (e.g. vegetarian, vegan, gluten-free, contains nuts, spicy) with an icon and a translatable label.
- **Component Story / Documentation Entry**: A documented rendering of a component or token set showing variants, states, usage guidance, and theme/appearance previews.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A guest can locate a named dish and read its price on a 360px-wide screen in under 10 seconds, in both light and dark appearance, in usability testing with at least 5 participants (≥ 90% success).
- **SC-002**: 100% of text/background and interactive-boundary token pairs in every shipped theme and appearance meet WCAG 2.1 AA contrast, verified by automated check.
- **SC-003**: A second, visually distinct theme can be applied to the full sample menu by changing only theme values — zero component edits — and the result passes the same accessibility and layout checks.
- **SC-004**: 0 literal color, spacing, or font-size values exist inside component code; 100% of visual values trace to a named token (verified by automated lint/scan).
- **SC-005**: A developer new to the project can assemble a new menu section (e.g. "daily specials") using only the documentation in under 30 minutes without creating any new token or component.
- **SC-006**: 100% of primitive and menu components appear in the living documentation with all documented variants and states, in both appearances and in at least two themes.
- **SC-007**: 100% of interactive components are operable by keyboard alone with a visible focus indicator, verified by automated accessibility checks and a manual keyboard pass.
- **SC-008**: The sample menu page renders without horizontal scroll and without clipped content at 320px, 375px, 768px, 1024px, and 1920px widths, in all three supported languages.
- **SC-009**: The sample menu page meets the project's performance budgets (LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 on a mid-tier mobile device over 4G) when built from the design system.
- **SC-010**: Users who prefer reduced motion see no non-essential animation (0 animated transitions beyond instant state changes) in the sample menu.
- **SC-011**: A mock "review your selection" screen can be composed from the ordering-oriented components alone, in all themes and both appearances, introducing 0 new tokens and 0 new visual styles beyond those used by the menu components.
- **SC-012**: The guest-facing sample menu, as shipped in this phase, exposes 0 ordering actions (no add, quantity, or submit affordances) — ordering components are present only in documentation.

## Assumptions

- The first release ships one production theme (the default warm restaurant theme) plus one example alternative theme that exists to prove and document theme-ability; it is not necessarily offered to restaurants yet.
- Themes are authored by the service operator/developers in this phase. A self-service theme editor for restaurant owners is out of scope; the token contract is designed so one could be built later.
- The product in this phase is menus-only: a restaurant publishes a menu and guests open it via a shareable link/QR code. The guest experience is read-only browsing. Ordering, cart, payment, and table-service *flows* are out of scope — but the ordering-oriented *components* (FR-014b) are in scope as documented, themed building blocks so a later revision can add ordering without new foundations. They are not wired to any behavior and do not appear on the shipped guest menu (SC-012).
- Guest access to a menu requires no account or sign-in; the link is the access mechanism. Access control, link expiry, and analytics are out of scope.
- Management/admin screens are a later phase; this feature provides the form and feedback primitives they will need but does not build the screens themselves (Story 4 is validated with a sample form in documentation only).
- Content (dish data, images, translations) is illustrative sample data supplied for documentation and testing; no data storage or backend integration is part of this feature.
- Supported languages are the project's existing three (Czech default, English, German); all component text flows through the project's existing translation mechanism. RTL support is not required now but must not be precluded.
- Light/dark appearance follows the existing project mechanism for appearance preference; this feature supplies warm variants for both.
- Existing project constraints apply: shared primitives are added through the project's established UI-primitive workflow, icons come from the project's single icon set, and the existing global token file is the single source of truth for tokens (extended, not duplicated).
- Photography/illustration style guidance (image aspect ratios, treatment) is included as documentation guidance and placeholder components; actual food photography is out of scope.
- "Warm tones" is interpreted as: cream/parchment/linen surfaces, terracotta/paprika/burnt-orange primary accent, deep wine/red-brown for emphasis, herb/olive green for positive states, warm charcoal for text, and warm (brown-tinted) darks for dark appearance. Exact values are decided in planning/design, constrained by the contrast requirements above.

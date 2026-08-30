# Feature Specification: Marketing Landing Page

**Feature Branch**: `002-marketing-landing-page`

**Created**: 2026-08-29

**Status**: Implemented (2026-08-29)

**Input**: User description: "Now we will need to create a landing page. The landing page should mention features that we currently have (will have within first iteration): digital menu, menu pdf generation, table qr code generation. The landing page should be appealing, preferably with a nice full-screen image first with a title in the middle (pull all assets from www.pexels.com). After that add some nice graphics and texts and at the bottom should be pricing section: free (1 menu, 30 items, branded pdf generation, branded QR codes), Pro (coming soon, 5 menus, unlimited items, no branding, 129 CZK/mo), Pro Plus (coming soon, menu parsing, unlimited menus, unlimited menu size, time menus (morning, evening menus), qr codes, generatable pdfs (infinite templates), etc...). Focus on catching customers first, reference latest design styling from current restaurants, the landing should feel premium"

## Product Context

The service lets a restaurant publish a digital menu that guests open through a link or a QR code. The landing page is the public front door of the service: it is the first thing a restaurant owner sees, and its only job is to convince them to start — for free — within a single visit. It is a **marketing page for restaurant owners**, not the guest-facing menu. It is served in all three supported languages and must look premium in the way current high-end restaurant websites do: large photography, generous whitespace, restrained typography, few but strong statements.

Three product capabilities exist (or ship in the first iteration) and are the substance of the page:

1. **Digital menu** — a beautiful, phone-first menu reachable by link.
2. **Menu PDF generation** — a printable version of the same menu, generated from the same data.
3. **Table QR code generation** — per-table QR codes that open the digital menu.

Everything else mentioned in pricing (Pro, Pro Plus) is a roadmap signal and must be clearly labelled as coming soon.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Owner Understands the Offer and Starts for Free (Priority: P1)

A restaurant owner lands on the page (from a search result, a shared link, or a business card). Within the first screen they see a full-viewport food/restaurant photograph with a single headline in the centre that states what the service does, a short supporting line, and one primary call to action to start for free. Scrolling down, they read a short section per capability (digital menu, PDF generation, QR codes), each illustrated. They reach the bottom, see that the Free plan costs nothing and covers a real menu, and click the call to action.

**Why this priority**: Customer acquisition is the stated focus. If a visitor cannot understand the offer and reach the free sign-up in one scroll, nothing else on the page matters.

**Independent Test**: Give five people unfamiliar with the product the page on a phone and ask "what does this do and what does it cost to start?". All five answer correctly within 30 seconds and can point to how to begin.

**Acceptance Scenarios**:

1. **Given** a visitor opens the page on any device from 320px to 1920px wide, **When** the page first renders, **Then** the hero fills the viewport with a photograph, the headline and primary call to action are visible without scrolling, and there is no horizontal page scroll.
2. **Given** a visitor scrolls past the hero, **When** they read the feature area, **Then** exactly three capability sections are present — digital menu, menu PDF generation, table QR codes — each with a title, a one-to-two-sentence benefit statement written for restaurant owners, and a visual.
3. **Given** a visitor clicks any primary call to action (hero, pricing Free card, or footer), **When** the action completes, **Then** they are taken to the entry point for creating a free account/menu.
4. **Given** a visitor with a slow mobile connection, **When** the page loads, **Then** the headline and call to action are readable before the hero photograph finishes loading (the hero never blocks reading the offer).

---

### User Story 2 - Owner Compares Plans and Sees the Roadmap (Priority: P2)

At the bottom of the page the owner finds a pricing section with three plans side by side. Free is available now and clearly positioned as the recommended starting point. Pro and Pro Plus are visibly marked "coming soon" so the owner understands the product is growing but does not expect to buy them today.

**Why this priority**: Pricing transparency removes the biggest objection ("what will this cost me?") and the roadmap plans communicate ambition and justify the free tier's limits. It is second only to the core offer.

**Independent Test**: A tester can name every limit of the Free plan, state the Pro monthly price in CZK, and identify which plans are not yet purchasable — all from the pricing section alone.

**Acceptance Scenarios**:

1. **Given** the pricing section, **When** viewed, **Then** three plans are shown in the order Free, Pro, Pro Plus, each with a name, a price line, a feature list, and a call to action.
2. **Given** the Free plan card, **When** read, **Then** it lists: 1 menu, up to 30 menu items, PDF generation with service branding, QR codes with service branding; its price reads as free; its call to action starts sign-up.
3. **Given** the Pro plan card, **When** read, **Then** it is labelled coming soon, shows 129 CZK per month, and lists: 5 menus, unlimited items, no service branding.
4. **Given** the Pro Plus plan card, **When** read, **Then** it is labelled coming soon, shows no fixed price (positioned as the top tier), and lists at minimum: automatic menu parsing/import from an existing menu, unlimited menus, unlimited menu size, time-based menus (e.g. morning and evening menus), QR codes, PDF generation with an unlimited choice of templates.
5. **Given** either coming-soon plan, **When** the visitor activates its call to action, **Then** they are offered a way to be notified when the plan launches, and are never asked to pay.
6. **Given** a viewport narrower than 768px, **When** the pricing section renders, **Then** the plan cards stack vertically with Free first and remain fully readable.

---

### User Story 3 - Owner Reads the Page in Their Language and Preferred Appearance (Priority: P3)

A Czech, English, or German-speaking owner sees the page entirely in their language, with prices formatted for that locale, and the page respects their light/dark appearance preference while keeping its premium character.

**Why this priority**: The service targets the Czech market with international guests and owners; a landing page that only works well in one language or one appearance undercuts the premium claim.

**Independent Test**: Open the page in each of `cs`, `en`, `de` in both light and dark appearance; every visible string is translated (no fallback language visible), the price line is locale-formatted, and photographs and text remain legible in both appearances.

**Acceptance Scenarios**:

1. **Given** the page is opened under any supported locale, **When** rendered, **Then** every user-visible text (headlines, feature copy, plan names, feature lists, calls to action, image descriptions, footer) is in that locale.
2. **Given** the page is rendered in dark appearance, **When** viewed, **Then** text over photographs and all interface text meet WCAG 2.1 AA contrast, and the page keeps the same layout and imagery.
3. **Given** a visitor who prefers reduced motion, **When** the page loads and scrolls, **Then** no decorative animation plays and all content is still reachable.

---

### Edge Cases

- What happens when a hero or feature photograph fails to load? The area shows a themed solid/gradient background so the headline and call to action remain fully readable; layout does not shift.
- What happens when translated copy is much longer (German headline, Czech feature lists)? Text wraps without overflowing cards or the hero; nothing is truncated or overlaps the call to action.
- What happens on very tall/narrow (phone) and very wide/short (laptop 1366×600) viewports? The hero still fills the viewport and the headline remains centred and unobstructed.
- What happens when a visitor arrives with keyboard only or a screen reader? All calls to action are reachable in reading order, images carry meaningful descriptions, and the "coming soon" state is announced in text, not only by visual styling.
- What happens when the sign-up destination is not yet live? The primary call to action still leads somewhere useful (e.g. a waitlist/contact capture) and never to a dead end.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The landing page MUST be the default page served at the locale root of the site for every supported locale.
- **FR-002**: The page MUST open with a full-viewport hero consisting of a single large piece of media — a photograph, or a short silent looping video clip that uses a photograph as its still — a centred headline stating the value proposition, a one-line sub-headline, and one primary call to action.
- **FR-003**: The hero headline and call to action MUST be readable before the media has loaded and MUST remain readable if the media never loads. When a video is used, the photograph still MUST be shown first and the video MUST NOT play for visitors who prefer reduced motion.
- **FR-004**: The page MUST present exactly three capability sections after the hero — digital menu, menu PDF generation, table QR code generation — each with a title, benefit-oriented copy for restaurant owners, and a visual (photograph or product illustration).
- **FR-005**: The page MUST include a short "how it starts" sequence (create menu → generate PDF/QR → guests scan) that communicates the setup can be done in minutes.
- **FR-006**: The page MUST end with a pricing section showing three plans in the order Free, Pro, Pro Plus.
- **FR-007**: The Free plan MUST show: price free; 1 menu; up to 30 menu items; PDF generation with service branding; QR codes with service branding; a call to action that starts sign-up.
- **FR-008**: The Pro plan MUST be marked "coming soon", show a price of 129 CZK per month, and list: 5 menus; unlimited items; no service branding.
- **FR-009**: The Pro Plus plan MUST be marked "coming soon", show no fixed price, and list at minimum: menu parsing/import; unlimited menus; unlimited menu size; time-based menus (morning/evening); QR codes; PDF generation with unlimited templates.
- **FR-010**: Calls to action on coming-soon plans MUST lead to a notify-me/interest capture, never to a purchase flow.
- **FR-011**: The Free plan MUST be visually highlighted as the recommended starting point.
- **FR-012**: All photography and video MUST be sourced from Pexels under its licence, with the photographer/videographer and source recorded, and each image MUST have a meaningful localized description. Photography MUST be downloaded and stored with the project. Video MAY instead be served from storage the project controls and streamed to the visitor; in neither case may media be hot-linked from a third party's CDN.
- **FR-020**: Hero video MUST be streamed rather than downloaded in full, and MUST NOT be requested at all until the page has finished loading. It MUST be skipped entirely for visitors who prefer reduced motion or reduced data, are on a connection slower than 4G, or are on a viewport too small for the video to be worth its bytes. Photographs MUST depict real restaurant/food settings consistent with a premium establishment (no stock-looking clip art).
- **FR-013**: All user-visible text MUST be available in Czech, English, and German; the currency amount MUST be formatted for the active locale.
- **FR-014**: The page MUST render correctly in both light and dark appearance and MUST use the existing design-system tokens (no one-off colours, spacing, or typography).
- **FR-015**: The page MUST be fully usable from 320px to 1920px viewport width with no horizontal page scroll.
- **FR-016**: The page MUST meet WCAG 2.1 AA: semantic landmarks and headings, keyboard-operable calls to action with visible focus, contrast on text over imagery, and "coming soon" conveyed in text.
- **FR-017**: Decorative motion (reveal on scroll, parallax) is permitted only if it is subtle, does not delay content, and is disabled when the visitor prefers reduced motion.
- **FR-018**: The page MUST include a minimal footer with the service name, a language switcher, and legal/contact placeholders.
- **FR-019**: The page MUST NOT reference or link to ordering, payments, or any capability outside the three shipped features except inside the clearly labelled coming-soon plan cards.

### Key Entities

- **Plan**: A pricing tier shown on the page. Attributes: name, availability (available / coming soon), price (amount + currency + period, or none), ordered list of feature statements, call-to-action type (start free / notify me), recommended flag.
- **Capability Section**: One of the three feature blocks. Attributes: title, benefit copy, visual asset, order.
- **Hero Asset**: A photograph with attribution (Pexels photographer, source URL), localized description, and a themed fallback.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a five-person unmoderated test, 100% of participants correctly state what the service does and that starting is free within 30 seconds of opening the page on a phone.
- **SC-002**: From any position on the page, a visitor can reach a "start for free" call to action with at most one scroll gesture or one click (hero, pricing, footer).
- **SC-003**: On a mid-tier phone over 4G the headline and primary call to action are visible within 2.5 seconds of navigation, and the layout does not shift once the photograph appears.
- **SC-004**: Zero untranslated strings and zero contrast failures across all six combinations of locale (cs/en/de) × appearance (light/dark).
- **SC-005**: A tester can list every Free plan limit and the Pro monthly price correctly after viewing the pricing section for 20 seconds.
- **SC-006**: The page passes an automated accessibility audit with no critical or serious findings.
- **SC-007**: Once live, at least 5% of unique landing-page visitors click a "start for free" call to action in the first month (baseline to refine later).

## Assumptions

- The primary call to action leads to the account/menu creation entry point. If sign-up is not live when the page ships, it leads to a waitlist/email capture with the same wording; the wording does not change between the two.
- "Coming soon" plans have no launch date on the page; interest is captured via a notify-me interaction (email address only). No payment or checkout exists in this feature.
- Pro Plus is deliberately shown without a price ("top tier, coming soon"); a price can be added later without layout change.
- Prices are quoted in CZK only, formatted per locale (e.g. `129 Kč/měsíc`, `CZK 129/month`, `129 CZK/Monat`). No EUR pricing in this iteration.
- "Branded" on the Free plan means the generated PDF and QR codes carry the service's own mark; "no branding" on Pro removes it.
- The page uses the default (warm) theme of the existing design system and follows the light/dark appearance axis; no per-restaurant theming applies to the landing page.
- Pexels photographs are downloaded and shipped with the project (not hot-linked) with photographer attribution recorded in the repository; the Pexels licence does not require on-page attribution.
- Where video is hosted was deferred and has since been decided (owner, 2026-08-29): a Cloudflare R2 bucket the project controls. The hero clip streams from there rather than living in git, because it is far too large to commit and the browser only needs the part it plays.
- The hero clip is a desktop-and-up enhancement. On phones the poster is the hero, which is also what the page falls back to whenever the clip is declined for any other reason.
- "Latest restaurant design styling" is interpreted as: full-bleed photography, large serif or refined display headline, generous vertical rhythm, muted warm palette, minimal chrome, very few competing elements per screen.
- No analytics, cookie banner, blog, testimonials, or customer logos are in scope for this iteration; the page structure leaves room to add testimonials above pricing later.
- The landing page replaces the current placeholder root page; the sample digital menu remains reachable at its existing route and may be linked from the digital-menu capability section as a live demo.

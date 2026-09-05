# Feature Specification: PDF Menu & Table Sticker Downloads

**Feature Branch**: `007-pdf-menu-stickers`

**Created**: 2026-09-04

**Status**: Draft

**Input**: User description: "I want to add feature of PDF downloads. We need two things: a pdf menu and a pdf with table stickers. Both menu and stickers pdfs should inherit styles from main menu. Both should include powered by restaura.cz(but it can be removed for higher tier users). QR codes should also include table numbers, and there should be 4 QR code stickers per page(total count specified by user)"

## Product Context

Today a restaurant owner can build a menu, pick one of six visual styles, and publish it at a stable public address. Guests reach it by link. The public pricing page already promises two things this feature delivers: the Free plan lists "PDF export with Restaura branding" and "Table QR codes with Restaura branding", and the Pro plan lists "No Restaura branding". Nothing behind those promises exists yet: there is no download, no QR code, and the system does not yet record which plan an account is on.

This feature adds two downloadable PDF documents to the owner's workspace:

1. **Menu PDF** — the menu as a printable document, rendered in the menu's chosen visual style, so the owner can print a paper menu that matches what guests see on their phones.
2. **Table sticker sheet** — a printable sheet of QR code stickers, four per page, each numbered for a table, that guests scan to open the published menu. Also rendered in the menu's visual style so the stickers match the venue's menu look.

Both documents end with a small "Powered by restaura.cz" line. Owners on a paid plan can turn that line off. Owners on the Free plan cannot.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Owner Downloads a Printable Menu (Priority: P1)

An owner opens one of their menus in the workspace and downloads it as a PDF. The document shows the restaurant identity (logo when present, name otherwise), the menu name, every section in order, and every dish with its description, price, dietary markers, availability, and highlight markers, styled in the menu's chosen visual style. The owner prints it or sends it to a print shop.

**Why this priority**: A printable menu is the single most requested companion to a digital one and is a stated Free-plan feature on the pricing page. It is valuable on its own even if stickers never ship.

**Independent Test**: Create a menu with three sections, a mix of dishes with and without photos, at least one dish with dietary markers and one marked unavailable, choose the "Refined" style, download the PDF, and open it in a standard PDF viewer. Every dish and price is present, the look is recognisably Refined, and the last page ends with the Restaura line.

**Acceptance Scenarios**:

1. **Given** an owner viewing one of their menus in the workspace, **When** they choose "Download menu PDF", **Then** a PDF file is delivered to their device within the performance budget and its filename identifies the menu.
2. **Given** a menu in any of the six visual styles, **When** its PDF is downloaded, **Then** the document uses that style's colours, type, and spacing character, and the same menu downloaded in a different style is visibly different while containing identical content.
3. **Given** a menu with sections and dishes, **When** its PDF is compared with the published guest page, **Then** the set of sections, dishes, descriptions, prices, dietary markers, availability states, and highlights is identical; nothing is hidden or added.
4. **Given** a restaurant with a logo, **When** the menu PDF is downloaded, **Then** the logo appears in the document header; **Given** no logo, **Then** the restaurant name appears in text with no placeholder or gap.
5. **Given** dishes with photos, **When** the menu PDF is downloaded, **Then** those photos appear with the dishes using the style's treatment, and dishes without photos render as they do on the guest page.
6. **Given** a menu whose content spans more than one page, **When** the PDF is viewed, **Then** no dish is split so that its name and price land on different pages, and each page after the first still identifies the menu.
7. **Given** a menu that is still a draft (not published), **When** the owner downloads its PDF, **Then** the download works exactly as for a published menu.
8. **Given** a menu with no dishes, **When** the owner looks for the download, **Then** the action is unavailable with an explanation that the menu needs content first.
9. **Given** an owner on the Free plan, **When** they download a menu PDF, **Then** the final page carries the "Powered by restaura.cz" line and no option to remove it is offered.
10. **Given** a menu belonging to owner A, **When** owner B or an anonymous party requests its PDF, **Then** the request is refused.

---

### User Story 2 - Owner Downloads Table QR Stickers (Priority: P1)

An owner with a published menu enters how many tables they have and downloads a sticker sheet. Each sticker shows a QR code that opens the published menu, the table's number in large type, the restaurant identity, and a short "Scan to see the menu" prompt. Four stickers fit on each page. The owner prints the sheet on sticker paper, cuts along the guides, and places one sticker on each table.

**Why this priority**: QR stickers are how guests actually reach the menu in the venue; without them the published address only travels by word of mouth. Equal in value to the menu PDF and a stated Free-plan feature.

**Independent Test**: Publish a menu, request 10 stickers, download the sheet, confirm it has three pages (4 + 4 + 2 stickers), confirm each sticker shows a distinct number 1 through 10, print page one at 100% scale, and scan each of its four QR codes with a phone camera. Each scan opens the published menu.

**Acceptance Scenarios**:

1. **Given** a published menu, **When** the owner chooses "Download table stickers", **Then** they are asked how many stickers they need before the file is produced.
2. **Given** the owner enters a count N between 1 and the allowed maximum, **When** they confirm, **Then** the sheet contains exactly N stickers numbered consecutively from 1 to N, laid out four per page, with the last page partially filled when N is not a multiple of four.
3. **Given** the owner enters zero, a negative number, a non-integer, or a value above the maximum, **When** they try to confirm, **Then** the input is rejected with a specific, localized message and no file is produced.
4. **Given** any sticker on the sheet, **When** its QR code is scanned with a standard phone camera from a print at 100% scale, **Then** the phone opens the menu's public address, and the address carries that sticker's table number in a form that does not change what the guest sees today.
5. **Given** a menu in any of the six visual styles, **When** the sticker sheet is downloaded, **Then** the stickers use that style's colours and type, while the QR code itself keeps enough contrast against its background to scan reliably.
6. **Given** each sticker, **When** it is viewed, **Then** it shows the table number in type large enough to read from a standing position, the restaurant logo (or name when no logo), a localized scan prompt, and the "Powered by restaura.cz" line unless the owner is entitled to remove it and has chosen to.
7. **Given** the printed sheet, **When** the owner cuts the stickers apart, **Then** visible cut guides separate the four stickers and each sticker's content has a safe margin from the cut lines.
8. **Given** a menu that is not published, **When** the owner looks for the sticker download, **Then** it is unavailable with an explanation that the menu must be published first, because the QR codes need a stable public address.
9. **Given** an owner unpublishes and later republishes the same menu, **When** they scan a sticker printed before unpublishing, **Then** it still opens the menu, because the public address is stable across that cycle.
10. **Given** a menu belonging to owner A, **When** owner B or an anonymous party requests its sticker sheet, **Then** the request is refused.

---

### User Story 3 - Paid-Plan Owner Removes Restaura Branding (Priority: P2)

An owner whose account is on the Pro or Pro Plus plan can choose, at download time, whether the "Powered by restaura.cz" line appears on the menu PDF and on each sticker. Free-plan owners always get the line.

**Why this priority**: This is the concrete upgrade incentive the pricing page advertises. It depends on Stories 1 and 2 and on the account carrying a plan, which no paid customer has yet because paid plans are not yet on sale, so it can ship after the two download stories without losing value.

**Independent Test**: With an account set to the Pro plan, open a menu's download options, confirm a "Show Restaura branding" control is present and defaults to off, download both documents, and confirm the line is absent. Switch the account to Free, confirm the control is gone and both documents carry the line.

**Acceptance Scenarios**:

1. **Given** an owner on the Free plan, **When** they open either download, **Then** no branding control is shown and every produced document carries the "Powered by restaura.cz" line.
2. **Given** an owner on the Pro or Pro Plus plan, **When** they open either download, **Then** a "Show Restaura branding" control is shown, defaulting to off.
3. **Given** a paid-plan owner with branding turned off, **When** they download the menu PDF, **Then** no page carries the line and the space it would occupy is closed up, not left blank.
4. **Given** a paid-plan owner with branding turned off, **When** they download stickers, **Then** no sticker carries the line.
5. **Given** a paid-plan owner who turns branding on, **When** they download either document, **Then** the line is present exactly as it is for Free-plan owners.
6. **Given** a Free-plan owner who tampers with the request to ask for no branding, **When** the document is produced, **Then** it still carries the line; entitlement is decided by the account's plan, not by the request.

---

### User Story 4 - Owner Previews Before Downloading (Priority: P3)

Before committing to a download, the owner sees a rendering of the first page of the document so they can confirm the style, the branding choice, and (for stickers) the numbering and layout look right.

**Why this priority**: Saves a print-and-regret cycle, but the downloads are fully useful without it, and the owner can simply open the downloaded file.

**Independent Test**: Open the download options for a published menu, confirm a first-page preview appears for each document type, change the sticker count and confirm the preview reflects a page with four stickers numbered 1 to 4, toggle branding (paid plan) and confirm the line appears and disappears in the preview.

**Acceptance Scenarios**:

1. **Given** an owner opening the menu PDF download, **When** the options are shown, **Then** a preview of the first page in the menu's style is displayed within the preview budget.
2. **Given** an owner opening the sticker download, **When** they change the count or the branding choice, **Then** the preview updates to reflect the change.
3. **Given** the preview cannot be produced, **When** the owner views the options, **Then** the download remains available and a localized message explains the preview is unavailable.

---

### Edge Cases

- A dish has a very long name or description: text wraps within the dish's block; it is never clipped or overlapped by neighbouring content.
- A section has no dishes: the section heading is still printed, matching the guest page behaviour.
- A menu has hundreds of dishes: the PDF paginates across as many pages as needed within the performance budget; the sticker count, not the menu size, drives the sticker sheet.
- The owner requests the maximum sticker count: the file is produced within budget and every QR code still scans.
- The restaurant name is very long: it is scaled or wrapped on the sticker without overlapping the QR code or the table number.
- The menu's public address changes (for example after a future address change feature): stickers printed earlier stop working; the owner is warned of this whenever the address changes. Today the address is stable across publish and unpublish.
- The style is Liquid Glass, whose guest look relies on translucency and blur: the printed documents use that style's solid fallback surfaces so text stays legible on paper.
- An image (logo or dish photo) cannot be loaded at render time: the document falls back to the no-image presentation for that element rather than showing a broken placeholder or failing the whole download.
- The owner's session expires between opening the options and confirming: the download is refused with the standard sign-in prompt, not a corrupt or empty file.
- Two downloads of the same unchanged menu are requested a minute apart: both succeed and produce the same content.
- The account plan changes between opening the options and downloading: the produced document reflects the plan at the moment of production.

## Requirements *(mandatory)*

### Functional Requirements

**Menu PDF**

- **FR-001**: The system MUST let an owner download any of their menus, draft or published, as a PDF document from the menu's workspace page, provided the menu has at least one dish.
- **FR-002**: The menu PDF MUST contain the restaurant identity (logo when present, otherwise the restaurant name in text), the menu name, all sections in their saved order, and for every dish its name, description, price, dietary markers, availability state, highlight markers, and photo when present. The content set MUST equal what the published guest page shows.
- **FR-003**: The menu PDF MUST be rendered in the menu's chosen visual style, using that style's light appearance and, where a style relies on translucency or motion, its solid fallback treatment.
- **FR-004**: The menu PDF MUST paginate so that a dish's name and price never fall on different pages, and every page MUST identify the menu.
- **FR-005**: The menu PDF filename MUST include the menu name in a form safe for common file systems.

**Table stickers**

- **FR-006**: The system MUST let an owner download a table sticker sheet for any of their published menus, and MUST refuse the download for unpublished menus with a localized explanation.
- **FR-007**: Before producing the sheet, the system MUST ask the owner for the number of stickers, accepting only whole numbers from 1 to 200 inclusive, and MUST reject anything else with a specific, localized message.
- **FR-008**: The sheet MUST contain exactly the requested number of stickers, numbered consecutively from 1, laid out four per page in a two-by-two grid on A4 paper, with the final page partially filled when the count is not a multiple of four.
- **FR-009**: Each sticker MUST show: a QR code, the table number in large type, the restaurant identity (logo when present, otherwise the name), and a localized prompt inviting the guest to scan for the menu.
- **FR-010**: Each sticker's QR code MUST encode the menu's public address together with that sticker's table number, in a form the guest page accepts today without any change in what the guest sees. The table number is carried so a later feature can use it; this feature MUST NOT alter the guest page.
- **FR-011**: Each QR code MUST scan successfully with a standard phone camera from a sheet printed at 100% scale, and MUST keep sufficient contrast against its background in every visual style.
- **FR-012**: The sheet MUST show cut guides between stickers, and every sticker's content MUST sit within a safe margin from the guides.
- **FR-013**: The sticker sheet MUST be rendered in the menu's chosen visual style under the same appearance and fallback rules as the menu PDF.

**Branding and plan entitlement**

- **FR-014**: Both documents MUST include a "Powered by restaura.cz" line by default: on the final page of the menu PDF and on every sticker.
- **FR-015**: The system MUST know each account's plan (Free, Pro, or Pro Plus). Accounts without an explicit plan MUST be treated as Free.
- **FR-016**: Owners on Pro or Pro Plus MUST be offered a "Show Restaura branding" control at download time, defaulting to off; owners on Free MUST NOT see the control.
- **FR-017**: The decision to omit the branding line MUST be enforced by the system using the account's plan at the time the document is produced, regardless of what the request asks for.
- **FR-018**: When branding is omitted, the layout MUST close up the space the line would have used, leaving no blank strip.

**Preview**

- **FR-019**: The download options for each document MUST show a preview of the first page that reflects the current style, branding choice, and (for stickers) the requested count; if the preview cannot be produced, the download MUST remain available with a localized notice.

**Access, localization, accessibility**

- **FR-020**: Only the owning account MAY download a menu's PDF or sticker sheet; any other party's request MUST be refused.
- **FR-021**: All owner-facing text introduced by this feature (buttons, labels, hints, validation messages, errors, notices) MUST be localized in Czech, English, and German. Text printed inside the documents (the scan prompt, the branding line, any fixed labels) MUST be localized in the owner's current interface language at the time of download.
- **FR-022**: The download flow MUST be fully operable by keyboard and correctly announced to assistive technology, and MUST meet WCAG 2.1 AA. Progress during production MUST be visible and announced.
- **FR-023**: If document production fails, the owner MUST see a localized message with a retry action, and MUST NOT receive an empty or corrupt file.
- **FR-024**: Whenever a menu's public address changes, the owner MUST be warned that previously printed stickers will stop working.

### Performance Requirements

- **PR-001**: A menu PDF for a menu of up to 200 dishes, including photos, MUST be delivered within 10 seconds of the owner confirming the download on a typical broadband connection, with visible progress during the wait.
- **PR-002**: A sticker sheet of 200 stickers MUST be delivered within 10 seconds under the same conditions.
- **PR-003**: A menu PDF for a 200-dish menu with photos MUST NOT exceed 15 MB; a menu without photos MUST NOT exceed 2 MB. A 200-sticker sheet MUST NOT exceed 5 MB.
- **PR-004**: A first-page preview MUST appear within 3 seconds of opening the download options and MUST update within 2 seconds of a change to count or branding.
- **PR-005**: Adding the download controls MUST NOT measurably slow the workspace menu page's load or the guest menu page.

### Key Entities *(include if feature involves data)*

- **Menu PDF**: A printable rendering of one menu at a point in time. Derived entirely from the menu, its sections and dishes, the restaurant profile, the menu's visual style, and the branding decision. Not stored; produced on request.
- **Table sticker sheet**: A printable set of N numbered stickers for one published menu. Derived from the menu's public address, the restaurant profile, the visual style, the requested count, and the branding decision. Not stored; produced on request.
- **Sticker**: One numbered unit on the sheet: table number, QR code encoding the public address plus that number, restaurant identity, scan prompt, optional branding line.
- **Account plan**: The plan an account is on (Free, Pro, Pro Plus). Determines whether the branding line may be omitted. Defaults to Free. How plans are purchased or changed is out of scope.
- **Branding decision**: Whether the "Powered by restaura.cz" line appears in a produced document. Always yes for Free; the owner's choice, defaulting to no, for Pro and Pro Plus.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An owner can go from opening a menu in the workspace to holding the downloaded menu PDF in under 30 seconds, including the wait for production.
- **SC-002**: An owner can go from opening a published menu to holding a 20-sticker sheet in under 45 seconds, including entering the count.
- **SC-003**: 100% of QR codes on a sheet printed at 100% scale on A4 open the correct menu when scanned with a current mainstream phone camera from 30 cm in ordinary indoor lighting.
- **SC-004**: For every one of the six visual styles, a reviewer shown the guest page and the menu PDF side by side identifies them as the same style; and for every style, all text in both documents meets WCAG 2.1 AA contrast on white paper.
- **SC-005**: 100% of documents produced for Free-plan accounts carry the branding line; 100% of documents produced for paid-plan accounts with branding turned off carry no such line.
- **SC-006**: 100% of invalid sticker counts are rejected before any production starts, with a message naming the allowed range.
- **SC-007**: 0% of download attempts result in an empty or unopenable file; every failure surfaces a message and a retry.
- **SC-008**: The guest menu page behaves identically before and after this feature, including when opened from a sticker QR code that carries a table number.
- **SC-009**: Every step of both download flows is completable with keyboard alone and passes an automated accessibility audit with no AA violations.

## Assumptions

- **Paper format**: A4 for both documents, since the product serves the Czech market. Letter and other formats are out of scope.
- **Sticker geometry**: Four stickers per A4 page in a two-by-two grid, each roughly a quarter page, with cut guides. Support for pre-cut label sheets with specific vendor dimensions is out of scope.
- **Numbering**: Stickers are numbered 1 to N. Custom table labels (names, ranges starting above 1, letters) are out of scope; owners with named tables can write over or beside the number.
- **Sticker maximum**: 200 stickers per sheet, which covers even very large venues while bounding production time. Owners needing more can download twice.
- **Table number in the QR address**: Carried as an optional part of the public address so a future ordering or table-service feature can read it. The guest page ignores it today, and this feature does not touch the guest page.
- **Photos in the menu PDF**: Included where present, because "inherit styles" implies fidelity to the guest page and every style already defines a photo treatment. An option to omit photos is out of scope.
- **Appearance**: Documents always use the style's light appearance; paper has no dark mode. Liquid Glass uses its existing solid fallback surfaces.
- **Document language**: Owner-entered content is printed as entered. Fixed labels inside the documents follow the owner's interface language at download time; per-document language selection is out of scope.
- **Plan tiers**: The three plans on the pricing page (Free, Pro, Pro Plus). "Higher tier" means Pro and Pro Plus. Paid plans are not yet on sale, so in practice every account is Free at launch; the entitlement logic still ships so that flipping an account's plan is a data change. Purchasing, billing, and plan changes by the owner are out of scope.
- **Branding control**: A per-download choice, not a saved account setting, defaulting to off for paid plans. Persisting the preference is a possible later enhancement.
- **No storage**: Produced documents are not kept; each download produces a fresh document reflecting the menu at that moment. Download history is out of scope.
- **Public address stability**: The current public address survives unpublish and republish. Any future feature that changes addresses must honour FR-024.
- **Unlimited PDF templates** (listed under Pro Plus on the pricing page) are out of scope; this feature ships exactly one document layout per visual style for each document type.
- **Existing capabilities reused**: authentication and ownership checks, the six visual styles, the restaurant profile with logo, dish photos, localization in Czech, English, and German, and the workspace menu page where publish controls already live.

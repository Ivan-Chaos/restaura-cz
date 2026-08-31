# Feature Specification: Base Menu Creation & Publishing

**Feature Branch**: `feature/be-fe/mvp-menu-creation`

**Created**: 2026-08-31

**Status**: Draft

**Input**: User description: "We will be creating a base menu creation now. What i see done in this feature is: user sign up, menu creation and menu filling, connection to db and storing data there. Menu creation form should involve visual variant switchers, but stubb those for now. Also i want to see menu publishing and display features. For the record when menu created, there will be a publish button, only afterwards it will be viewable"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Restaurant Owner Sign-Up & Sign-In (Priority: P1)

A restaurant owner visits the product, creates an account with their email and a password, and signs in. Once signed in, they land in a private workspace where their menus will live. Returning owners can sign back in and find everything exactly as they left it.

**Why this priority**: Every other capability in this feature (creating, filling, publishing menus) belongs to an account. Nothing else can be built or demonstrated without identity and a persistent workspace.

**Independent Test**: Can be fully tested by registering a new account, signing out, and signing back in — the account persists and gives access to an (empty) menu workspace. Delivers the foundation value of a private, durable space per restaurant owner.

**Acceptance Scenarios**:

1. **Given** a visitor with no account, **When** they submit a valid email and password on the sign-up form, **Then** an account is created, they are signed in, and they see their empty menu workspace.
2. **Given** a visitor entering an email already in use, **When** they attempt to sign up, **Then** they see a clear message that the account exists and are directed to sign in instead.
3. **Given** an existing account holder, **When** they sign in with correct credentials, **Then** they reach their workspace and see any menus they previously created.
4. **Given** an existing account holder, **When** they enter incorrect credentials, **Then** they see a non-revealing error message and remain signed out.
5. **Given** a signed-in owner, **When** they sign out, **Then** their workspace is no longer accessible without signing in again.

---

### User Story 2 - Menu Creation & Filling (Priority: P2)

A signed-in restaurant owner creates a new menu, gives it a name, and fills it with content: sections (e.g., "Starters", "Mains", "Drinks") and items within sections, each with a name, optional description, and price. The creation form displays a visual-variant switcher (a choice of how the menu will look), but at this stage only a single default variant is available — the switcher is present but non-functional beyond that default. All entered content is saved durably: the owner can leave and return later to continue editing, and nothing is lost.

**Why this priority**: This is the core content-creation value of the feature — without a filled menu there is nothing to publish or display. It depends only on User Story 1.

**Independent Test**: Can be fully tested by signing in, creating a menu, adding sections and items, closing the session, signing back in, and confirming the full menu content is intact.

**Acceptance Scenarios**:

1. **Given** a signed-in owner in their workspace, **When** they create a new menu with a name, **Then** the menu appears in their workspace in an unpublished state.
2. **Given** an owner editing a menu, **When** they add a section with a title, **Then** the section appears in the menu structure.
3. **Given** an owner editing a section, **When** they add an item with a name and price (description optional), **Then** the item appears within that section.
4. **Given** an owner editing a menu, **When** they edit or remove an existing section or item, **Then** the change is reflected and saved.
5. **Given** an owner editing a menu, **When** they view the visual-variant switcher, **Then** they see it with a single default variant selected and cannot switch to another variant (other options shown as unavailable/coming soon, or only the default is offered).
6. **Given** an owner who has added content to a menu, **When** they sign out and sign back in later, **Then** all menu content (name, sections, items, prices) is exactly as they left it.
7. **Given** an owner adding an item, **When** they submit it without a name or with an invalid price (e.g., negative or non-numeric), **Then** they see a validation message and the item is not saved until corrected.

---

### User Story 3 - Menu Publishing (Priority: P3)

An owner who has filled a menu decides it is ready and presses a "Publish" button. Until that moment, the menu is not viewable by anyone but the owner. After publishing, the menu becomes publicly viewable at its own address. The owner can also unpublish the menu to take it offline again.

**Why this priority**: Publishing is the gate that turns private content into guest-facing value. It depends on User Story 2 (there must be a menu to publish), and User Story 4 depends on it.

**Independent Test**: Can be fully tested by creating a menu, verifying its public address is inaccessible, publishing it, verifying the address now works, unpublishing, and verifying access is revoked again.

**Acceptance Scenarios**:

1. **Given** an unpublished menu, **When** anyone (including a signed-out visitor) tries to access its public address, **Then** the menu is not shown and they see an appropriate "not available" response.
2. **Given** an owner viewing their unpublished menu, **When** they press the Publish button, **Then** the menu's status changes to published and the owner is shown the public address where it can be viewed.
3. **Given** a published menu, **When** the owner presses Unpublish, **Then** the menu returns to unpublished status and its public address stops showing it.
4. **Given** a published menu, **When** the owner edits its content and saves, **Then** the public view reflects the saved changes.
5. **Given** a menu belonging to owner A, **When** owner B (or any other party) attempts to publish, unpublish, or edit it, **Then** the action is refused.

---

### User Story 4 - Public Menu Display (Priority: P4)

A guest — with no account and no sign-in — opens a published menu's public address (e.g., by scanning a QR code or following a link the restaurant shared) and sees the menu rendered in its default visual variant: menu name, sections in order, and items with names, descriptions, and prices. The page is readable on a phone.

**Why this priority**: This is the end-consumer payoff of the whole feature, but it can only exist after sign-up, creation, and publishing are in place.

**Independent Test**: Can be fully tested by publishing a filled menu and opening its public address in a fresh browser session (no authentication) on a mobile-sized viewport, confirming all content renders correctly.

**Acceptance Scenarios**:

1. **Given** a published menu, **When** a signed-out guest opens its public address, **Then** they see the full menu — name, sections in their defined order, and each item's name, description, and price — without being asked to sign in.
2. **Given** a published menu viewed on a mobile phone, **When** the guest scrolls through it, **Then** all content is legible and usable without horizontal scrolling.
3. **Given** a public address for a menu that was unpublished or never existed, **When** a guest opens it, **Then** they see a friendly "menu not available" message rather than an error screen.

---

### Edge Cases

- What happens when an owner publishes a menu that has no sections or items? The publish action succeeds, and the public page renders the menu name with an empty state — an empty menu is the owner's choice, not an error. (Alternatively the UI may warn, but must not block.)
- How does the system handle two browser tabs editing the same menu? Last save wins; the feature does not require concurrent-edit protection at this stage.
- What happens when a guest is viewing a public menu at the moment it is unpublished? Already-loaded pages may remain visible; any new request for the address returns "not available".
- What happens when an owner deletes a section that contains items? The owner is asked to confirm, and the section with all its items is removed.
- What happens with very long content (e.g., a 100-item menu or a very long item description)? Content is stored and rendered without truncation of meaning; the public page remains scrollable and usable.
- What happens when saving fails (e.g., connectivity loss)? The owner sees a clear error and their entered data is not silently discarded from the form.

## Requirements *(mandatory)*

### Functional Requirements

**Accounts & Access**

- **FR-001**: System MUST allow a visitor to create an account using an email address and password.
- **FR-002**: System MUST validate email format and enforce a minimum password strength (at least 8 characters) at sign-up, with clear validation messages.
- **FR-003**: System MUST reject sign-up with an email that already has an account and guide the visitor to sign in.
- **FR-004**: System MUST allow account holders to sign in and sign out; failed sign-in attempts MUST return a message that does not reveal whether the email exists.
- **FR-005**: System MUST restrict all menu creation, editing, publishing, and unpublishing actions to the signed-in owner of the menu.

**Menu Creation & Filling**

- **FR-006**: Signed-in owners MUST be able to create a menu with a name; a new menu MUST start in the unpublished state.
- **FR-007**: Owners MUST be able to add, rename, reorder, and delete sections within a menu.
- **FR-008**: Owners MUST be able to add, edit, reorder, and delete items within a section; each item MUST have a name and price, and MAY have a description.
- **FR-009**: System MUST validate item input: name is required; price is required and must be a non-negative amount.
- **FR-010**: The menu creation/editing form MUST display a visual-variant switcher; for this feature only one default variant is available — the control is visible but switching is stubbed (other variants absent or marked unavailable). The chosen variant MUST be stored with the menu so future variants slot in without data changes.
- **FR-011**: System MUST persist all menu data (menus, sections, items, variant selection, publish status) in durable storage so that it survives sign-out, browser restarts, and system restarts.
- **FR-012**: Owners MUST be able to see a list of all their menus with each menu's publish status.
- **FR-013**: Owners MUST be able to delete a menu they own after confirming the action; deleting a published menu also removes its public availability.

**Publishing & Display**

- **FR-014**: Each menu MUST have a Publish action available to its owner; publishing changes the menu to the published state and makes it available at a stable public address.
- **FR-015**: An unpublished menu MUST NOT be viewable by anyone other than its signed-in owner; requests to its public address MUST return a "not available" response.
- **FR-016**: Owners MUST be able to unpublish a published menu, immediately removing public availability for new requests.
- **FR-017**: After publishing, the system MUST show the owner the public address of the menu so they can share it.
- **FR-018**: The public menu page MUST render the menu name, its sections in order, and each item's name, description (when present), and price, in the menu's default visual variant, without requiring any authentication.
- **FR-019**: The public menu page MUST be usable on mobile-phone screens (readable text, no horizontal scrolling).
- **FR-020**: Saved edits to a published menu MUST be reflected in the public view on subsequent requests.

### Key Entities

- **Owner Account**: A restaurant owner's identity — email, credentials, and ownership of menus. One account can own multiple menus.
- **Menu**: A named collection of sections belonging to one owner. Carries a publish status (unpublished/published), a selected visual variant (default-only for now), and a stable public address once published.
- **Menu Section**: A titled grouping within a menu (e.g., "Starters"), ordered relative to its sibling sections; contains items.
- **Menu Item**: A single offering within a section — name (required), description (optional), price (required, non-negative) — ordered relative to sibling items.
- **Visual Variant**: A named presentation style for a menu's public display. Only one default variant exists in this feature; the entity exists so menus record their selection from day one.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new restaurant owner can go from arriving with no account to having a published menu with at least 2 sections and 5 items in under 10 minutes, unassisted.
- **SC-002**: 100% of menu content entered and saved by an owner is present after signing out and back in — zero data loss across sessions in acceptance testing.
- **SC-003**: An unpublished menu's public address returns "not available" in 100% of attempts; the same address serves the menu in 100% of attempts after publishing.
- **SC-004**: A guest on a mobile phone over a typical cellular connection sees the published menu content within 3 seconds of opening its address.
- **SC-005**: The public menu page is fully usable on screens from small phones upward with no horizontal scrolling and legible text throughout.
- **SC-006**: 95% of first-time owners successfully add a section and an item without external help (measured in usability testing).

## Assumptions

- **Account model**: One account represents one restaurant owner; an account can create and own multiple menus. Restaurant profile details (name, address, branding) are out of scope for this feature.
- **Authentication method**: Standard email + password sign-up/sign-in is sufficient; social sign-in, email verification, and password reset flows are out of scope for this feature and can be added later.
- **Menu structure**: A two-level structure (sections containing items) with name/description/price per item is the accepted baseline; photos, allergens, tags, and multi-language menu content are out of scope for this feature.
- **Prices and currency**: Prices are single amounts displayed in Czech koruna (CZK); multi-currency support is out of scope.
- **Publishing model**: Publishing is a simple visibility toggle — there is no separate draft-vs-live snapshot. Edits saved to a published menu become publicly visible on subsequent requests. A draft/preview workflow can come later.
- **Public address**: Each menu gets one stable public address at publish time; custom or vanity addresses and QR-code generation are out of scope for this feature (the address itself is QR-encodable later).
- **Visual variants**: Exactly one default variant ships now; the switcher UI is present but stubbed. The data model records the selection so future variants require no migration of intent.
- **Concurrency**: Single-editor use is assumed; last save wins if the same menu is edited in parallel.

# Feature Specification: Sign-Up Expansion & Dashboard Revamp

**Feature Branch**: `002-signup-dashboard-revamp`

**Created**: 2026-08-31

**Status**: Draft

**Input**: User description: "Now we will be working on user sign-up expansion. What we need to add is a proper registration form, user should enter their info such as email, password, confirm password, restaurant name, phone number(s), location etc then only should they be able to proceed onto their dashboard, which should also be reworked, give it a proper header and a proper layout, force light tones on the dashboard itself, when user is logged it show them a sidebar with menus, settings etc. Menus should look like a boring list item, style it more like a menu, so user clicks on it and then they are taken to a form. General point of this is to refine the log in flow and to enhance UI and UX so it doesn't look like a generic haphazardously made app. Also settings should get it's own page with tabs, because we're gonna manage subscriptions there"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Full Registration with Restaurant Profile (Priority: P1)

A restaurant owner arrives at the sign-up page and completes a proper registration form: email, password, password confirmation, restaurant name, one or more phone numbers, and the restaurant's location. Only when every required field is valid and the registration completes is the owner allowed into their dashboard. The form guides them — clear labels, inline validation, and helpful error messages — so registration feels deliberate and trustworthy rather than a bare-bones stub.

**Why this priority**: The restaurant profile (name, phones, location) is the identity of everything the product does — menus, public pages, and future subscriptions all hang off it. Gating dashboard access on a complete profile is the stated core of the feature; nothing downstream makes sense without it.

**Independent Test**: Can be fully tested by registering a brand-new account through the expanded form, confirming validation blocks incomplete/invalid submissions, and confirming that a successful registration lands the owner on their dashboard with the profile data persisted (visible after sign-out and sign-in).

**Acceptance Scenarios**:

1. **Given** a visitor on the sign-up form, **When** they submit valid values for email, password, password confirmation, restaurant name, at least one phone number, and location, **Then** an account with the full restaurant profile is created and they proceed to their dashboard.
2. **Given** a visitor filling the form, **When** the password and its confirmation do not match, **Then** they see an inline mismatch message and cannot submit until corrected.
3. **Given** a visitor filling the form, **When** any required field is empty or invalid (malformed email, weak password, invalid phone number, missing restaurant name or location), **Then** the specific field is flagged with a clear message and submission is blocked.
4. **Given** a visitor entering phone numbers, **When** they choose to add another phone number, **Then** an additional phone field appears, and they can remove any extra field before submitting (at least one phone number always remains required).
5. **Given** a visitor entering an email already in use, **When** they attempt to register, **Then** they see a clear message that the account exists and a way to go to sign-in instead.
6. **Given** an owner who successfully registered, **When** they sign out and sign back in, **Then** their restaurant profile (name, phone numbers, location) is intact.
7. **Given** an existing account created before this feature (profile incomplete), **When** the owner signs in, **Then** they are asked to complete the missing profile fields before they can reach the dashboard.

---

### User Story 2 - Reworked Dashboard Shell (Priority: P2)

A signed-in owner lands in a reworked dashboard: a proper header (product identity, account affordances such as sign-out), a persistent sidebar with navigation entries (Menus, Settings, and room for future sections), and a coherent content layout. The dashboard is always presented in light tones, regardless of the visitor's device/browser appearance preference, and reads as an intentionally designed product rather than a generic scaffold.

**Why this priority**: The shell is the frame every signed-in experience lives in — the menus list and settings page (stories 3 and 4) render inside it. It is the single biggest lever on the "doesn't look haphazardly made" goal.

**Independent Test**: Can be fully tested by signing in and verifying the header, sidebar, and layout are present on every dashboard page, navigation entries route correctly, and the dashboard renders in light tones even when the device is set to dark appearance.

**Acceptance Scenarios**:

1. **Given** a signed-in owner, **When** they open the dashboard, **Then** they see a header with product identity and account controls (including sign-out) and a sidebar listing at least Menus and Settings.
2. **Given** a signed-in owner anywhere in the dashboard, **When** they click a sidebar entry, **Then** they are taken to that section and the sidebar indicates which section is active.
3. **Given** a device set to dark appearance, **When** the owner views any dashboard page, **Then** the dashboard renders in light tones (public-facing pages outside the dashboard are unaffected).
4. **Given** a signed-out visitor, **When** they try to open any dashboard page directly, **Then** they are redirected to sign-in, and after signing in they arrive in the dashboard.
5. **Given** an owner on a small screen, **When** they use the dashboard, **Then** the header and sidebar adapt (e.g., collapsible navigation) so all sections remain reachable without horizontal scrolling.

---

### User Story 3 - Menus Presented Like Menus (Priority: P3)

In the Menus section, each of the owner's menus is presented as a visually rich, menu-like item — evoking an actual restaurant menu rather than a boring list row — showing at least the menu's name and its publish status. Clicking a menu takes the owner to the menu's editing form. Creating a new menu is equally discoverable from this view.

**Why this priority**: This is the owner's daily working surface and the most visible "generic app" offender today, but it depends on the reworked shell (story 2) to live in.

**Independent Test**: Can be fully tested by signing in with an account that has several menus, verifying each renders as a styled menu-like item with name and status, clicking one and landing on its editing form, and creating a new menu from the same view.

**Acceptance Scenarios**:

1. **Given** an owner with existing menus, **When** they open the Menus section, **Then** each menu appears as a styled, menu-like item showing its name and publish status — not a plain list row.
2. **Given** the Menus section, **When** the owner clicks a menu item, **Then** they are taken to that menu's editing form.
3. **Given** an owner with no menus yet, **When** they open the Menus section, **Then** they see an inviting empty state with a clear action to create their first menu.
4. **Given** the Menus section, **When** the owner triggers menu creation, **Then** they are taken into the menu creation flow, and the new menu subsequently appears in the styled list.

---

### User Story 4 - Settings Page with Tabs (Priority: P4)

The owner opens Settings from the sidebar and finds a dedicated settings page organized into tabs — account/profile details (restaurant name, phone numbers, location, credentials-related actions) and a Subscription tab that establishes the place where subscriptions will be managed. The owner can review and update their restaurant profile there.

**Why this priority**: Settings completes the dashboard's information architecture and prepares the ground for subscription management, but it delivers value only once registration collects the profile (story 1) and the shell exists (story 2).

**Independent Test**: Can be fully tested by navigating to Settings, switching between tabs, editing a profile field (e.g., restaurant name or a phone number), saving, and confirming the change persists across sign-out/sign-in.

**Acceptance Scenarios**:

1. **Given** a signed-in owner, **When** they open Settings from the sidebar, **Then** they land on a dedicated settings page organized into tabs.
2. **Given** the settings page, **When** the owner switches tabs, **Then** the corresponding tab content is shown and the active tab is clearly indicated.
3. **Given** the profile tab, **When** the owner edits their restaurant name, phone numbers, or location and saves, **Then** the changes are validated with the same rules as registration and persist durably.
4. **Given** the Subscription tab, **When** the owner opens it, **Then** they see the current state of their subscription (at minimum a placeholder describing their current plan/status), with full management explicitly out of scope for this feature.
5. **Given** an invalid edit (e.g., removing all phone numbers, clearing restaurant name), **When** the owner tries to save, **Then** the save is blocked with a clear field-level message.

---

### Edge Cases

- Registration is submitted twice rapidly (double-click): only one account is created; the second attempt is ignored or reports the account exists.
- The owner abandons registration halfway: no partial account grants dashboard access; returning later means starting fresh (or completing the profile-completion step if the account already exists without a profile).
- A pre-existing account with no restaurant profile deep-links straight to a dashboard URL: they are routed to profile completion first, then returned to their intended destination.
- Device/browser is set to dark appearance: dashboard stays light-toned while public pages (landing, public menus, legal pages) keep their existing behavior.
- Phone number entered with spaces, dashes, or an international prefix: accepted and normalized rather than rejected on formatting alone.
- Location entered ambiguously (very short or nonsensical text): accepted as free-form text within length limits — the system does not verify real-world existence of the address.
- A very long restaurant name or many phone numbers: layout does not break; sensible limits apply (see FR-007) with clear messages when exceeded.
- Settings opened in two tabs and edited in both: last save wins; the stale tab's next load reflects the latest data.
- Navigating directly to a settings tab URL (if tab state is addressable) lands the owner on that tab.

## Requirements *(mandatory)*

### Functional Requirements

**Registration & Sign-In Flow**

- **FR-001**: The sign-up form MUST collect: email, password, password confirmation, restaurant name, one or more phone numbers, and location.
- **FR-002**: The system MUST validate every field inline before account creation: well-formed email, password meeting the existing strength policy, matching confirmation, non-empty restaurant name, at least one valid phone number, and non-empty location.
- **FR-003**: Users MUST be able to add and remove additional phone number fields during registration and in settings, with a minimum of one and a maximum of three phone numbers.
- **FR-004**: The system MUST NOT grant access to the dashboard until registration has completed with a full, valid restaurant profile.
- **FR-005**: Accounts that exist without a complete restaurant profile MUST be routed to a profile-completion step on sign-in and blocked from the dashboard until it is completed.
- **FR-006**: On duplicate-email registration attempts, the system MUST show a clear, non-technical message and offer a path to sign-in.
- **FR-007**: The system MUST enforce sensible input limits (e.g., restaurant name and location length caps, phone number length) and communicate them when exceeded.
- **FR-008**: All registration, validation, and error text MUST flow through the product's localization system, consistent with the rest of the product.

**Dashboard Shell**

- **FR-009**: All signed-in pages MUST share one dashboard shell consisting of a header (product identity, account controls including sign-out) and a sidebar navigation.
- **FR-010**: The sidebar MUST include entries for Menus and Settings, indicate the active section, and be extensible for future sections.
- **FR-011**: The dashboard MUST always render in light tones, regardless of the device or browser appearance preference; pages outside the dashboard are unaffected.
- **FR-012**: The dashboard shell MUST be usable on small screens: navigation remains reachable (e.g., collapsible) and no horizontal scrolling is required.
- **FR-013**: Direct access to any dashboard page while signed out MUST redirect to sign-in and return the user to their intended destination after authenticating.

**Menus Presentation**

- **FR-014**: The Menus section MUST present each menu as a styled, menu-like item showing at least the menu name and publish status.
- **FR-015**: Activating a menu item MUST take the owner to that menu's editing form.
- **FR-016**: The Menus section MUST provide a clear creation action, including an inviting empty state when the owner has no menus.

**Settings**

- **FR-017**: Settings MUST be a dedicated page reachable from the sidebar, organized into tabs.
- **FR-018**: A profile tab MUST let the owner view and update restaurant name, phone numbers, and location, applying the same validation rules as registration; changes MUST persist durably.
- **FR-019**: A Subscription tab MUST exist and display the owner's current subscription state (a plan/status placeholder is sufficient); managing or changing subscriptions is out of scope for this feature.
- **FR-020**: Invalid settings edits (e.g., zero phone numbers, empty restaurant name) MUST be blocked with field-level messages and MUST NOT overwrite stored data.

### Key Entities

- **Owner Account**: The authenticated identity (email + credentials) that owns a workspace; already exists, now extended with a required link to a Restaurant Profile.
- **Restaurant Profile**: The business identity attached to an owner account — restaurant name, one to three phone numbers, and location (free-form address text). Required for dashboard access; editable in Settings.
- **Subscription (placeholder)**: The owner's plan/status shown in the Subscription tab; read-only in this feature, to be managed in a future feature.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new restaurant owner can complete the full registration (including profile fields) in under 3 minutes on the first attempt.
- **SC-002**: 100% of accounts reaching the dashboard have a complete restaurant profile (name, ≥1 phone number, location) — verified across new registrations and legacy accounts.
- **SC-003**: Every invalid registration submission produces a field-specific message; no submission fails silently or with a generic-only error.
- **SC-004**: From any dashboard page, the owner can reach Menus or Settings in at most 2 interactions.
- **SC-005**: With the device set to dark appearance, 100% of dashboard pages render in light tones, while public pages retain their existing appearance behavior.
- **SC-006**: An owner can locate a specific menu by name and open its editing form within 10 seconds of landing in the Menus section.
- **SC-007**: A profile change made in Settings survives sign-out and sign-in with zero data loss.
- **SC-008**: Dashboard pages remain fully usable (no horizontal scrolling, all navigation reachable) at typical mobile viewport widths.

## Assumptions

- Registration is a single form (optionally visually grouped into steps), not a multi-session wizard; there is no email verification step in this feature.
- Location is captured as free-form address text (single field or street/city grouping) with length limits; no map integration, geocoding, or address verification in this feature.
- Phone numbers are stored per entry with light normalization (trimming, allowing international prefixes); a cap of three numbers is assumed as a sensible default.
- The product is pre-launch with few or no legacy accounts; legacy accounts lacking a profile are handled by the profile-completion gate (FR-005) rather than a data migration.
- "Light tones" means the dashboard uses the product's light design-token palette exclusively; a user-facing theme toggle for the dashboard is out of scope.
- The Subscription tab is a structural placeholder showing current plan/status only; billing, plan changes, and payment methods arrive in a later feature.
- The existing sign-in form remains email + password; "refining the log-in flow" means consistent styling, validation, error messaging, and post-auth routing (including the profile-completion gate), not new authentication methods.
- The menu editing form itself (sections, items, publishing) already exists from feature 001 and is reused as the click-through destination; this feature restyles the path to it, not the editor's internals.

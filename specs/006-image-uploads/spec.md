# Feature Specification: Logo & Dish Image Uploads

**Feature Branch**: `006-image-uploads`

**Created**: 2026-09-03

**Status**: Draft

**Input**: User description: "now we're going for the big one: image uploads. I want users to be able to upload and edit their logo(edit as in crop position around etc) and to upload images for the dishes. I know our menus right now don't include images, but allow support of such option, if they don't it's totally fine, we just skip them. Same for logo, we just use text name for their restaurant. For storage we will use cloudflare's r2"

## Product Context

Today a restaurant is represented to guests by its name in text, and every dish is a name, an optional description, and a price. The guest-facing menu already knows how to show a restaurant logo and a photo per dish when one is present, and already looks complete when none is: the header shows the name in text, and dish rows simply have no picture. The dish editing form even reserves a spot for an image control that does nothing yet. What is missing is the whole owner side: a way to get pictures in, adjust them, replace them, and remove them, and a durable place to keep them.

This feature adds two kinds of owner-uploaded images:

1. **Restaurant logo**: one per restaurant. The owner uploads a picture and adjusts how it sits inside a fixed square frame (zoom in or out, drag to reposition) so the result is a clean, centred mark. It appears wherever the restaurant is identified to guests, and in the owner's own workspace.
2. **Dish photos**: at most one per dish. The owner uploads a picture and adjusts it inside a fixed landscape frame using the same tool, so every dish photo on a menu shares one shape and the menu stays tidy.

Images are strictly optional. A restaurant with no logo is shown by name. A dish with no photo is shown without one. Nothing prompts, nags, or penalises an owner for leaving them out, and a menu may freely mix dishes with and without photos.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Owner Uploads and Adjusts a Logo (Priority: P1)

A signed-in owner opens their restaurant profile settings, chooses an image file from their device, and sees it inside a square frame. They drag to reposition and zoom to fit, confirm, and the logo is saved. The workspace immediately shows the new logo, and returning later shows the same logo.

**Why this priority**: The logo is a single, account-wide asset that touches every menu at once, so it delivers the most visible value for the least owner effort. It also establishes the complete upload, adjust, store, and display path that dish photos reuse.

**Independent Test**: Sign in, open profile settings, upload a rectangular image, drag and zoom it in the frame, save, reload the page, and confirm the saved logo shows the chosen crop. Delivers a branded profile even before any menu shows it.

**Acceptance Scenarios**:

1. **Given** an owner on the profile settings page with no logo, **When** they view the logo area, **Then** they see a clearly labelled empty state with an "Upload logo" action and a hint of accepted formats and the size limit.
2. **Given** an owner who has chosen a valid image file, **When** the adjust step opens, **Then** the image is shown inside a fixed square frame, fills the frame by default, and can be dragged to reposition and zoomed in or out within sensible bounds so no empty area is ever exposed inside the frame.
3. **Given** an owner in the adjust step, **When** they confirm, **Then** the cropped result is saved, a success confirmation consistent with other settings saves is shown, and the logo preview on the page reflects the exact framing they chose.
4. **Given** an owner in the adjust step, **When** they cancel, **Then** nothing is saved, no file is kept, and the previously saved logo (or empty state) remains.
5. **Given** an owner with a saved logo, **When** they choose "Replace", **Then** they go through the same choose-and-adjust flow and the new logo replaces the old one on save.
6. **Given** an owner with a saved logo, **When** they choose "Remove" and confirm, **Then** the logo is deleted, the empty state returns, and guests once again see the restaurant name in text.
7. **Given** an owner who selects a file that is not an accepted image type, or exceeds the size limit, **When** they attempt to upload, **Then** they see a specific, localized validation message before any upload starts and nothing is saved.
8. **Given** a network failure or storage error during save, **When** the upload does not complete, **Then** the owner sees a localized error with a retry action and their previous logo is untouched.
9. **Given** owner A's logo, **When** owner B or an anonymous party attempts to change or remove it, **Then** the action is refused.

---

### User Story 2 - Guests See the Logo (Priority: P1)

A guest opens a published menu and sees the restaurant's logo in the menu header and on the cover, in whichever visual style the owner chose. If the restaurant has no logo, the guest sees the name in text exactly as today.

**Why this priority**: The upload only has value once guests see the result. It is P1 alongside Story 1 because neither delivers value alone.

**Independent Test**: Publish a menu for a restaurant with a logo, open its public address in a fresh browser session on a phone-sized viewport, and confirm the logo appears with the correct framing. Remove the logo and confirm the header falls back to the text name.

**Acceptance Scenarios**:

1. **Given** a published menu whose restaurant has a logo, **When** a guest opens it, **Then** the logo appears in the header and cover in the position each visual style defines, sharp on high-density screens, with the restaurant name available as its text alternative.
2. **Given** a published menu whose restaurant has no logo, **When** a guest opens it, **Then** the header and cover show the restaurant name in text with no empty gap, placeholder, or broken image.
3. **Given** an owner who replaces or removes the logo, **When** a guest next loads any of that restaurant's published menus, **Then** the guest sees the new state, not a stale image.
4. **Given** a logo in any of the six visual styles in both light and dark appearance, **When** the guest views the header, **Then** the logo is not stretched, clipped differently from the owner's chosen framing, or obscured by the style's decoration.

---

### User Story 3 - Owner Adds a Photo to a Dish (Priority: P2)

While editing a dish, the owner chooses an image, adjusts it inside a fixed landscape frame with the same drag-and-zoom tool used for the logo, and saves. The dish now carries a photo the owner can later replace or remove. Dishes without photos are unaffected.

**Why this priority**: Dish photos are the higher-volume, higher-effort part of the feature and depend on the upload path proven by the logo. They are optional per dish, so the product is complete without them, but they are the main reason owners asked for images.

**Independent Test**: Open a menu, edit a dish, upload and adjust a photo, save, reload the editor, and confirm the dish shows the photo thumbnail. Edit another dish without adding a photo and confirm it saves normally.

**Acceptance Scenarios**:

1. **Given** an owner editing a dish with no photo, **When** they view the dish form, **Then** the image field shows an empty state with an "Add photo" action, a hint of accepted formats and size limit, and the form is fully usable without adding one.
2. **Given** an owner who chose a valid image for a dish, **When** the adjust step opens, **Then** the image sits inside a fixed landscape frame with the same drag-and-zoom behaviour as the logo tool.
3. **Given** an owner who confirmed the adjustment, **When** they save the dish, **Then** the photo is stored with the dish and the dish list in the editor shows a thumbnail of it.
4. **Given** an owner who uploaded a photo but then cancels or abandons the dish form, **When** they return, **Then** the dish has no photo and no orphaned file remains stored for the account.
5. **Given** a dish with a photo, **When** the owner chooses "Replace" or "Remove", **Then** the change takes effect on save and the old file is no longer retained.
6. **Given** a dish with a photo, **When** the owner deletes the dish or its section, or the menu, **Then** the associated photo is removed from storage as well.
7. **Given** a menu with many dishes, **When** the owner adds photos to only some of them, **Then** the editor shows thumbnails only where photos exist and never a placeholder that suggests something is missing.
8. **Given** an invalid file type, an oversized file, or a failed upload, **When** the owner attempts to add a dish photo, **Then** they see the same localized validation and error behaviour as the logo flow, and the rest of the dish form is still saveable.

---

### User Story 4 - Guests See Dish Photos (Priority: P2)

A guest opens a published menu and sees photos on the dishes that have them, laid out by the menu's visual style. Dishes without photos look exactly as they do today. Photos load quickly on a phone and never cause the menu to jump around while loading.

**Why this priority**: This is the payoff of Story 3 and follows the same logic as Story 2.

**Independent Test**: Publish a menu where some dishes have photos and some do not, open it on a 360px-wide viewport on a throttled mobile connection, and confirm photos appear on the right dishes, at a consistent shape, without layout shift, and that photo-less dishes render as before.

**Acceptance Scenarios**:

1. **Given** a published menu with a mix of dishes with and without photos, **When** a guest opens it, **Then** each dish with a photo shows it in the shape the visual style defines, and dishes without show no image area, placeholder, or broken image.
2. **Given** a published menu with photos, **When** the guest scrolls, **Then** photos below the fold load as they approach and the page layout does not shift as they arrive.
3. **Given** a guest on a phone, **When** a dish photo is delivered, **Then** it is sized for the display width rather than at its original upload size.
4. **Given** each of the six visual styles, **When** a menu with photos is rendered, **Then** photos respect the style's treatment (large in photo-forward styles, small and understated in restrained styles) while keeping the owner's chosen framing.
5. **Given** a dish marked unavailable, **When** its photo is shown, **Then** the unavailable state remains visibly and textually distinguished as it is today.

---

### Edge Cases

- The owner uploads a very large photo straight from a phone camera (for example 12 megapixels, 8 MB). The adjust step must stay responsive and the stored result must be reduced to display-appropriate dimensions rather than kept at full camera resolution.
- The owner uploads an image smaller than the target frame. It is accepted and scaled up as needed rather than rejected, and the owner is not shown a false error.
- The owner uploads a transparent logo (for example a PNG with a transparent background). Transparency is preserved in the stored result so the logo sits cleanly on both light and dark guest appearances.
- The owner uploads an animated image. Only a single still frame is kept.
- The owner uploads a file whose extension says it is an image but whose content is not. It is rejected with the same "not an accepted image" message, and nothing is stored.
- The owner's photo carries orientation metadata (a phone held sideways). The adjust step shows it the right way up and the stored result is stored the right way up.
- The owner navigates away in the middle of an upload. No partial or orphaned file is left attributed to the account, and the previously saved image is unaffected.
- Two browser tabs edit the same dish's photo. The last save wins and no file becomes unreachable or doubly referenced.
- A guest opens a menu while the owner is mid-replacement of a photo. The guest sees either the old or the new photo, never a broken image.
- A stored image file is missing or unreachable when a guest loads the page. The dish or header falls back to the no-image presentation rather than showing a broken image.
- An owner deletes their account. Every image they uploaded is removed from storage.
- The owner uses keyboard only, or a screen reader. The choose, adjust, confirm, replace, and remove actions are all reachable and operable without a pointer, and the adjust step offers keyboard controls for repositioning and zoom.

## Requirements *(mandatory)*

### Functional Requirements

**Logo**

- **FR-001**: The system MUST allow an owner to attach exactly one logo to their restaurant profile, and to replace or remove it.
- **FR-002**: The logo MUST be stored as a square image reflecting the owner's chosen framing; the framing MUST be adjustable by dragging to reposition and by zooming in and out within bounds that never expose empty frame area.
- **FR-003**: Wherever a restaurant is identified to guests (menu header, menu cover) and in the owner's workspace, the system MUST show the logo when present and the restaurant name in text when absent, with no placeholder or gap in the absent case.
- **FR-004**: The logo image MUST carry the restaurant name as its text alternative.

**Dish photos**

- **FR-005**: The system MUST allow an owner to attach at most one photo to each dish, and to replace or remove it, from within the existing dish editing flow.
- **FR-006**: Dish photos MUST be stored in a single fixed landscape shape reflecting the owner's chosen framing, adjusted with the same reposition-and-zoom tool as the logo.
- **FR-007**: The dish photo MUST carry the dish name as its text alternative.
- **FR-008**: Dishes without a photo MUST render for guests exactly as they do today, and a menu MUST be able to mix dishes with and without photos.
- **FR-009**: The owner's menu editor MUST show a thumbnail for dishes that have a photo and nothing image-related for dishes that do not, beyond the "Add photo" control within the dish form.

**Upload behaviour**

- **FR-010**: The system MUST accept JPEG, PNG, and WebP images up to 10 MB in original size and MUST reject anything else with a specific, localized message before any upload begins. File content, not only the filename, MUST determine acceptance.
- **FR-011**: The system MUST honour embedded orientation metadata so images appear the right way up in the adjust step and in storage.
- **FR-012**: The system MUST reduce stored images to display-appropriate dimensions and MUST NOT retain the original full-resolution upload once the adjusted result is saved.
- **FR-013**: The system MUST preserve transparency in logos.
- **FR-014**: Cancelling or abandoning an upload MUST leave no orphaned file attributed to the account; any file not attached to a saved logo or dish within a short grace period MUST be cleaned up automatically.
- **FR-015**: Replacing or removing an image, deleting a dish, section, menu, or account MUST remove the images that are no longer referenced from storage.
- **FR-016**: Upload failures MUST be reported with a localized message and a retry action, and MUST leave the previously saved image untouched.

**Access & delivery**

- **FR-017**: Only the owning account MAY upload, replace, or remove its logo or dish photos; any other party's attempt MUST be refused.
- **FR-018**: Images shown on a published menu MUST be viewable by anonymous guests; image addresses MUST NOT be guessable from account, menu, or dish identifiers.
- **FR-019**: After an owner replaces or removes an image, the next guest load of any affected published menu MUST reflect the change.
- **FR-020**: If a stored image cannot be delivered, the guest page MUST fall back to the no-image presentation rather than show a broken image.

**Quality**

- **FR-021**: All owner-facing text introduced by this feature (labels, hints, validation messages, errors, confirmations) MUST be localized in Czech, English, and German.
- **FR-022**: Every action in the upload and adjust flow MUST be operable by keyboard and announced correctly to assistive technology, and MUST meet WCAG 2.1 AA.
- **FR-023**: Each of the six existing visual styles MUST render logos and dish photos according to its own treatment while preserving the owner's chosen framing.

### Performance Requirements

- **PR-001**: The guest menu page with a logo and dish photos MUST meet the existing guest-page budgets on a mid-tier mobile device over 4G on a production build: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1. Photos MUST reserve their space before loading so they contribute zero layout shift.
- **PR-002**: Delivered images MUST be sized for the viewport. A dish photo delivered to a phone-width viewport MUST NOT exceed 120 KB; a logo MUST NOT exceed 40 KB.
- **PR-003**: Dish photos below the fold MUST be loaded lazily; the logo and any above-the-fold photo MAY load eagerly.
- **PR-004**: The adjust step MUST become interactive within 2 seconds of the owner choosing a 10 MB, 12-megapixel file on a mid-tier laptop, and dragging and zooming MUST feel continuous with no visible stutter.
- **PR-005**: Saving an adjusted image MUST complete within 5 seconds on a typical broadband connection, with visible progress during the wait.
- **PR-006**: Adding image support MUST NOT increase what a guest's browser has to download before the menu page becomes interactive; the adjust tool MUST be loaded only in the owner's editing flows and only when the owner starts an upload.

### Key Entities

- **Restaurant Logo**: The single square image identifying a restaurant. Belongs to the restaurant profile. Attributes: where the stored file lives, its stored dimensions, when it was set. Absent for most restaurants initially.
- **Dish Photo**: The single landscape image attached to a dish. Belongs to a dish and is removed with it. Attributes: where the stored file lives, its stored dimensions, when it was set. Absent is the normal state.
- **Uploaded Image File**: The stored, adjusted result of an upload. Referenced by exactly one logo or dish photo once saved. Unreferenced files are transient and cleaned up.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An owner can go from opening profile settings to seeing their saved logo in under 90 seconds, including choosing and adjusting the image.
- **SC-002**: An owner can add a photo to a dish in under 60 seconds from opening the dish form.
- **SC-003**: 95% of first-time upload attempts with valid images succeed without the owner needing to retry.
- **SC-004**: 100% of invalid files (wrong type, too large, corrupted) are rejected with a specific message before any upload starts.
- **SC-005**: Guest menu pages with photos meet the same Core Web Vitals budgets as menus without photos on a mid-tier phone over 4G.
- **SC-006**: Zero orphaned image files remain attributed to an account 24 hours after any cancelled, abandoned, replaced, or deleted upload.
- **SC-007**: Menus and restaurants with no images look identical to how they look before this feature ships, verified across all six visual styles in both appearances.
- **SC-008**: Every upload, adjust, replace, and remove action is completable with keyboard only and passes an automated accessibility audit with no AA violations.

## Assumptions

- **Storage**: The product owner has decided uploaded images are stored in Cloudflare R2. This is a fixed dependency for planning; the spec does not otherwise prescribe how storage or delivery is built.
- **Logo belongs to the restaurant, not the menu**: The restaurant name already lives on the profile, and a logo is a property of the restaurant, so the logo is set once in profile settings and applies to all of that restaurant's menus.
- **One image per dish, one logo per restaurant**: Galleries and multiple angles are out of scope. A dish gets at most one photo.
- **Fixed shapes**: The logo is square. Dish photos are a single landscape shape (4:3), which matches the shape the guest menu and its visual styles already expect. Owners adjust the image within the frame rather than choosing a shape.
- **Same adjust tool for both**: Dish photos use the same drag-and-zoom tool as the logo so owners learn one interaction and the product keeps one consistent behaviour to maintain.
- **Text alternatives are derived, not typed**: The logo's text alternative is the restaurant name and each dish photo's is the dish name. No separate alt text field is offered in this feature.
- **Accepted formats and limit**: JPEG, PNG, and WebP up to 10 MB cover what owners export from design tools and phone cameras. HEIC from iPhones is not accepted in this feature; iOS converts to JPEG on share by default and the validation message names the accepted formats.
- **No per-menu "show photos" toggle**: Photos are shown wherever they exist. Owners control visibility by adding or removing photos.
- **No image editing beyond framing**: Filters, rotation controls, colour correction, and text overlays are out of scope. Orientation metadata is honoured automatically.
- **No quota beyond the per-entity limit**: Storage growth is bounded naturally by one logo per restaurant and one photo per dish. Account-level quotas can be added later without changing this feature's behaviour.
- **Existing visual-style photo treatments apply**: Feature 005 already defines how each style treats photos when present (large in Modern, understated in Refined, and so on). This feature supplies real photos; it does not redefine those treatments.
- **Sample menu unchanged**: The public sample menu keeps its existing bundled photos and is not affected by owner uploads.

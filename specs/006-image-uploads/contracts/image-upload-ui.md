# Contract: Image Upload UI (frontend)

**Date**: 2026-09-03 | **Plan**: [plan.md](../plan.md) | **Research**: R7, R8, R9

This documents the frontend-internal contracts the feature introduces: the `FormData` the Server Actions read, the field-error vocabulary the forms translate, the component props, and the display mapping. Stories and unit tests pin them.

## 1. Server Action `FormData` fields

### Logo (`uploadLogoAction`, `removeLogoAction`)

| Field | Value | Notes |
|---|---|---|
| `locale` | `cs` \| `en` \| `de` | as every action |
| `image` | `File` | `uploadLogoAction` only |
| `cropX`, `cropY`, `cropWidth`, `cropHeight` | integer strings | optional as a group; oriented source pixels |

`removeLogoAction` takes only `locale`. Both return `FormState`. On success both `revalidatePath` the settings page and the workspace layout (sidebar), and every published menu of the account cannot be enumerated from the frontend, so guest freshness relies on the public page being `force-dynamic` (already true) and on replacement producing a new URL.

### Dish (`addItemAction`, `updateItemAction` — extended)

Existing fields (`locale`, `menuId`, `sectionId`, `itemId?`, `name`, `description`, `priceCzk`) plus:

| Field | Value | Notes |
|---|---|---|
| `image` | `File` | present when the owner attached or replaced a photo in this submit |
| `cropX`, `cropY`, `cropWidth`, `cropHeight` | integer strings | with `image`, optional as a group |
| `removeImage` | `"1"` | present when the owner removed the existing photo; ignored if `image` is also present |

Action sequence:
1. `readItem` (unchanged) → on failure return field errors; nothing is sent.
2. `readImageUpload` → validates `image` size/type by sniffing bytes and the crop group; on failure return `{ fields: { image: code } }`.
3. Text save: `POST` (add) or `PATCH` (edit; skipped when no text field changed).
4. Image step: `PUT …/image` with multipart, or `DELETE …/image` for `removeImage`.
5. If step 3 fails → return its errors (nothing uploaded). If step 4 fails after step 3 succeeded → return `{ status: "error", code: "VALIDATION_FAILED", fields: { image: <code> } }` (the dish is saved; the form stays open showing the image error; the owner can retry or cancel).

## 2. Field-error codes the forms translate

Added to `FieldErrorCode` in `lib/api/types.ts` and to `MenuEditor.fieldErrors` and `Settings.fieldErrors` in all three catalogues:

| Code | Rendered under | Message intent |
|---|---|---|
| `MAX_FILE_SIZE` | image field | "Choose an image up to 10 MB." |
| `IS_IMAGE` | image field | "Use a JPEG, PNG or WebP image." |
| `IS_CROP` | image field | "The selected area does not fit the image. Adjust it and try again." |

The browser produces the same codes before any request (`lib/validation/image.ts`), so a rejected file reads identically whether the browser or the API noticed.

## 3. Components

### `components/workspace/ImageField.tsx` (client)

```ts
interface ImageFieldProps {
  /** Which rendition this field produces; sets the crop aspect and copy. */
  kind: "logo" | "dish";
  /** The stored image, if any. */
  current: ImageModel | null;
  /** Called when the owner confirms a crop or clears the field. */
  onChange: (next: PendingImage) => void;
  /** Field id prefix for label/description/error wiring. */
  idPrefix: string;
  /** A field-level code to show, from browser or server validation. */
  error?: FieldErrorCode | "INVALID";
  disabled?: boolean;
}

type PendingImage =
  | { kind: "keep" }
  | { kind: "remove" }
  | { kind: "replace"; file: File; crop: CropRect; previewUrl: string };

interface CropRect { x: number; y: number; width: number; height: number } // oriented source px
```

Behaviour:
- Empty state: label, "Add photo"/"Upload logo" button, description "JPEG, PNG or WebP, up to 10 MB".
- Filled state: preview (current or pending) with **Replace** and **Remove** buttons.
- On file pick: size check, magic-byte sniff (`ff d8 ff`, `89 50 4e 47`, `52 49 46 46 … 57 45 42 50`); failure sets `error` and does not open the dialog.
- Opens `ImageCropDialog` (dynamically imported). Confirm → `onChange({ kind: "replace", … })`; Cancel → no change.
- Keyboard: all buttons are real `<button>`s; the file input is visually hidden but focusable via its label button.
- Accessibility: preview `<img>` has `alt` = restaurant or dish name (passed in `current.alt` or a `previewAlt` prop); status changes announced via `role="status"`.

### `components/workspace/ImageCropDialog.tsx` (client, `next/dynamic`)

```ts
interface ImageCropDialogProps {
  open: boolean;
  file: File | null;
  aspect: 1 | 4 / 3;
  onConfirm: (crop: CropRect) => void;
  onCancel: () => void;
}
```

- shadcn `Dialog`; `react-easy-crop` with `aspect`, `restrictPosition` (no empty frame area), `zoomWithScroll`, `keyboardStep`; shadcn `Slider` for zoom (min 1, max 4, step 0.01) with an accessible label.
- Dialog title and instructions are localized (`ImageCrop` namespace); focus is trapped; `Escape` cancels.
- Returns `croppedAreaPixels` from `onCropComplete` as `CropRect`.

### `components/settings/LogoField.tsx` (client)

Wraps `ImageField kind="logo"` in its own `<form>`s (upload and remove), uses `uploadLogoAction`/`removeLogoAction`, toasts success (`Settings.logoSaved`, `Settings.logoRemoved`), shows the summary error like `ProfileSettingsForm`.

### `components/workspace/ItemForm.tsx` (modified)

Gains an `ImageField kind="dish"` between description and price (the slot the mock reserves), holds `PendingImage` in local state, and `itemFormData` appends `image` + crop fields or `removeImage` accordingly. Editing defaults: `current = item.image` mapped to `ImageModel`.

### `components/workspace/ItemRow.tsx` (modified)

Shows a 64×48 thumbnail (`next/image`, `sizes="64px"`) when `item.image` is set; renders nothing image-related otherwise.

### `components/menu/SafeImage.tsx` (client, tiny)

```ts
type SafeImageProps = ImageProps & { fallback: React.ReactNode };
```

Renders `next/image`; on `onError` renders `fallback` instead. Used by `DishImage` (fallback: the existing placeholder box) and by `MenuHeader`/`MenuCover` for the logo (fallback: `null`, so the text name stands alone). This is the only client component the feature adds to the guest page.

## 4. Display mapping (`lib/menu-display/adapter.ts`)

```ts
toImageModel(ref: ImageRef | null | undefined, alt: string): ImageModel | undefined
// → { src: ref.url, alt, width: ref.width, height: ref.height } or undefined

toDisplayMenu(menu: PublicMenu): Menu
// establishment: { name: menu.name, logo: toImageModel(menu.logo, menu.restaurantName) }
// item.image: toImageModel(item.image, item.name)
```

Both `null` and `undefined` map to "no image".

## 5. Configuration

- `next.config.ts`: `images.remotePatterns = [new URL(`${IMAGE_PUBLIC_URL}/**`)]` where `IMAGE_PUBLIC_URL` defaults to `http://localhost:3001/dev-images`; `experimental.serverActions.bodySizeLimit = "12mb"`. The `dangerouslyAllowSVG` comment is rewritten to state that user uploads are never SVG (rejected at the API) and are confined to this host.
- New shadcn primitive: `slider` (via `pnpm dlx shadcn@latest add slider`).
- New dependency: `react-easy-crop`.

## 6. Message namespaces (cs, en, de)

- `ImageField`: `addPhoto`, `uploadLogo`, `replace`, `remove`, `hint` ("JPEG, PNG or WebP, up to 10 MB"), `pendingPhoto`, `pendingLogo`, `removedPending`.
- `ImageCrop`: `title`, `instructions`, `zoom`, `confirm`, `cancel`, `dragHint`.
- `Settings`: `logoSection`, `logoDescription`, `logoSaved`, `logoRemoved`, `removeLogoTitle`, `removeLogoBody`, `fieldErrors.{MAX_FILE_SIZE,IS_IMAGE,IS_CROP}`.
- `MenuEditor`: `itemPhoto`, `itemPhotoThumb`, `fieldErrors.{MAX_FILE_SIZE,IS_IMAGE,IS_CROP}`.

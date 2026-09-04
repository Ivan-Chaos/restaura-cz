import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { readImageUpload } from "@/lib/validation/form-data";
import { itemFormData, logoFormData } from "@/lib/validation/form-values";
import {
  isCropRect,
  MAX_IMAGE_BYTES,
  sniffImageType,
  toWholePixels,
  validateImageFile,
} from "@/lib/validation/image";

const FIXTURES = join(process.cwd(), "tests/fixtures/images");

async function fixture(name: string, type = "image/jpeg"): Promise<File> {
  const bytes = await readFile(join(FIXTURES, name));
  return new File([new Uint8Array(bytes)], name, { type });
}

function fileOfSize(bytes: number): File {
  return new File([new Uint8Array(bytes)], "huge.jpg", { type: "image/jpeg" });
}

/**
 * The browser's check is a courtesy — the API decodes every upload and is the
 * authority — but it is the courtesy that makes an invalid file cost nothing.
 * These cases are the ones that decide whether an owner waits for a 10 MB
 * upload to learn their file was never an image.
 */
describe("sniffImageType", () => {
  it.each([
    ["JPEG", "dish-4x3.jpg", "jpeg"],
    ["PNG", "logo-alpha.png", "png"],
    ["WebP", "tiny.webp", "webp"],
  ])("recognises a real %s by its leading bytes", async (_label, name, expected) => {
    const bytes = new Uint8Array(await readFile(join(FIXTURES, name)));
    expect(sniffImageType(bytes)).toBe(expected);
  });

  it("does not trust the extension", async () => {
    // Text bytes under a .png name: the operating system will call this
    // image/png, and it is not an image at all.
    const bytes = new Uint8Array(await readFile(join(FIXTURES, "not-an-image.png")));
    expect(sniffImageType(bytes)).toBeNull();
  });

  it.each([
    ["random bytes", [0x00, 0x01, 0x02, 0x03]],
    ["a GIF header", [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
    ["an SVG opening tag", [0x3c, 0x73, 0x76, 0x67]],
    ["nothing at all", []],
  ])("rejects %s", (_label, bytes) => {
    expect(sniffImageType(new Uint8Array(bytes))).toBeNull();
  });

  it("does not mistake a RIFF container that is not WebP", () => {
    // "RIFF....AVI " — a real container, the wrong kind.
    const riffAvi = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x10, 0x00, 0x00, 0x00, 0x41, 0x56, 0x49, 0x20,
    ]);
    expect(sniffImageType(riffAvi)).toBeNull();
  });
});

describe("validateImageFile", () => {
  it("accepts each supported format", async () => {
    expect(await validateImageFile(await fixture("dish-4x3.jpg"))).toBeNull();
    expect(await validateImageFile(await fixture("logo-alpha.png", "image/png"))).toBeNull();
    expect(await validateImageFile(await fixture("tiny.webp", "image/webp"))).toBeNull();
  });

  it("refuses a file over the limit before reading a byte of it", async () => {
    expect(await validateImageFile(fileOfSize(MAX_IMAGE_BYTES + 1))).toBe("MAX_FILE_SIZE");
  });

  it("accepts a file exactly at the limit", async () => {
    // Size is checked first, so this reaches the sniff and fails there instead
    // — which is the point: the boundary is not off by one.
    expect(await validateImageFile(fileOfSize(MAX_IMAGE_BYTES))).toBe("IS_IMAGE");
  });

  it("refuses content that is not an image, whatever it is called", async () => {
    expect(await validateImageFile(await fixture("not-an-image.png", "image/png"))).toBe(
      "IS_IMAGE",
    );
  });

  it("refuses an empty file", async () => {
    expect(await validateImageFile(new File([], "empty.jpg", { type: "image/jpeg" }))).toBe(
      "IS_IMAGE",
    );
  });
});

describe("crop rectangles", () => {
  it("accepts a whole-pixel rectangle", () => {
    expect(isCropRect({ x: 0, y: 0, width: 100, height: 75 })).toBe(true);
  });

  it.each([
    ["a fractional origin", { x: 0.5, y: 0, width: 100, height: 75 }],
    ["a negative origin", { x: -1, y: 0, width: 100, height: 75 }],
    ["zero width", { x: 0, y: 0, width: 0, height: 75 }],
    ["a missing field", { x: 0, y: 0, width: 100 }],
    ["not an object", "10,10,100,75"],
  ])("rejects %s", (_label, value) => {
    expect(isCropRect(value)).toBe(false);
  });

  it("rounds inward, so a valid framing can never overflow the image", () => {
    // Rounding the origin up and the size down keeps the rectangle inside the
    // bounds the crop tool measured it against.
    expect(toWholePixels({ x: 10.2, y: 0.7, width: 99.9, height: 74.6 })).toEqual({
      x: 11,
      y: 1,
      width: 99,
      height: 74,
    });
  });

  /**
   * Regression: a crop tool that never managed to measure the image reports a
   * zero-sized area. Clamping that to a legal 1×1 rectangle was silently
   * uploadable — the API extracted one pixel and upscaled it, storing a flat
   * grey square. A measurement failure has to stay a failure.
   */
  it.each([
    ["a zero-sized area", { x: 0, y: 0, width: 0, height: 0 }],
    ["zero width", { x: 10, y: 10, width: 0, height: 80 }],
    ["zero height", { x: 10, y: 10, width: 80, height: 0 }],
    ["sub-pixel width", { x: 0, y: 0, width: 0.4, height: 80 }],
    ["a NaN from an unmeasured image", { x: 0, y: 0, width: NaN, height: NaN }],
  ])("refuses %s rather than clamping it to something uploadable", (_label, rect) => {
    expect(toWholePixels(rect)).toBeNull();
  });

  it("still accepts a rectangle that is merely small but real", () => {
    expect(toWholePixels({ x: 0, y: 0, width: 32, height: 24 })).toEqual({
      x: 0,
      y: 0,
      width: 32,
      height: 24,
    });
  });
});

describe("readImageUpload", () => {
  async function read(build: (form: FormData) => void | Promise<void>) {
    const form = new FormData();
    await build(form);
    return readImageUpload(form);
  }

  it("reports nothing to do for a form with no image parts", async () => {
    const result = await read(() => {});
    expect(result.ok && result.values).toEqual({ kind: "none" });
  });

  it("reads a removal", async () => {
    const result = await read((form) => form.set("removeImage", "1"));
    expect(result.ok && result.values).toEqual({ kind: "remove" });
  });

  it("reads a replacement with its framing", async () => {
    const file = await fixture("dish-4x3.jpg");
    const result = await read((form) => {
      form.set("image", file);
      form.set("cropX", "10");
      form.set("cropY", "20");
      form.set("cropWidth", "800");
      form.set("cropHeight", "600");
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values.kind).toBe("replace");
    if (result.values.kind !== "replace") return;
    expect(result.values.crop).toEqual({ x: 10, y: 20, width: 800, height: 600 });
  });

  it("accepts a replacement with no framing, which is the no-JavaScript path", async () => {
    const file = await fixture("dish-4x3.jpg");
    const result = await read((form) => form.set("image", file));

    expect(result.ok).toBe(true);
    if (!result.ok || result.values.kind !== "replace") return;
    expect(result.values.crop).toBeUndefined();
  });

  it("prefers a chosen file over a stale removal flag", async () => {
    const file = await fixture("dish-4x3.jpg");
    const result = await read((form) => {
      form.set("removeImage", "1");
      form.set("image", file);
    });

    expect(result.ok && result.values.kind).toBe("replace");
  });

  it("rejects a partial framing rather than silently centre-cropping", async () => {
    const file = await fixture("dish-4x3.jpg");
    const result = await read((form) => {
      form.set("image", file);
      form.set("cropX", "10");
      form.set("cropY", "20");
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.state).toMatchObject({ fields: { image: "IS_CROP" } });
  });

  it("rejects an unusable framing", async () => {
    const file = await fixture("dish-4x3.jpg");
    const result = await read((form) => {
      form.set("image", file);
      form.set("cropX", "-5");
      form.set("cropY", "0");
      form.set("cropWidth", "100");
      form.set("cropHeight", "75");
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.state).toMatchObject({ fields: { image: "IS_CROP" } });
  });

  it("rejects a file that is not an image, before any request", async () => {
    const file = await fixture("not-an-image.png", "image/png");
    const result = await read((form) => form.set("image", file));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.state).toMatchObject({ fields: { image: "IS_IMAGE" } });
  });

  it("rejects an oversized file", async () => {
    const result = await read((form) => form.set("image", fileOfSize(MAX_IMAGE_BYTES + 1)));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.state).toMatchObject({ fields: { image: "MAX_FILE_SIZE" } });
  });
});

describe("form bodies", () => {
  const VALUES = { name: "Svíčková", description: "", priceCzk: "189" };
  const HIDDEN = { locale: "cs", menuId: "m1", sectionId: "s1" };

  it("sends no image parts when the image is untouched", () => {
    const form = itemFormData(VALUES, HIDDEN, { kind: "keep" });

    expect(form.get("image")).toBeNull();
    expect(form.get("removeImage")).toBeNull();
    expect(form.get("cropX")).toBeNull();
  });

  it("sends no image parts when the caller passes nothing at all", () => {
    const form = itemFormData(VALUES, HIDDEN);
    expect(form.get("image")).toBeNull();
  });

  it("flags a removal", () => {
    const form = itemFormData(VALUES, HIDDEN, { kind: "remove" });

    expect(form.get("removeImage")).toBe("1");
    expect(form.get("image")).toBeNull();
  });

  it("carries the file and its framing as separate fields", async () => {
    const file = await fixture("dish-4x3.jpg");
    const form = itemFormData(VALUES, HIDDEN, {
      kind: "replace",
      file,
      crop: { x: 1, y: 2, width: 300, height: 225 },
      previewUrl: "blob:preview",
    });

    expect(form.get("image")).toBeInstanceOf(File);
    expect(form.get("cropX")).toBe("1");
    expect(form.get("cropY")).toBe("2");
    expect(form.get("cropWidth")).toBe("300");
    expect(form.get("cropHeight")).toBe("225");
    // The dish's own fields still travel in the same body.
    expect(form.get("name")).toBe("Svíčková");
  });

  it("builds a logo body carrying the locale the action needs", async () => {
    const file = await fixture("logo-alpha.png", "image/png");
    const form = logoFormData(file, { x: 0, y: 0, width: 400, height: 400 }, { locale: "de" });

    expect(form.get("image")).toBeInstanceOf(File);
    expect(form.get("cropWidth")).toBe("400");
    expect(form.get("locale")).toBe("de");
  });
});

import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import {
  describe as describeImage,
  gif,
  jpeg,
  jpegWithOrientation6,
  pngWithAlpha,
  svg,
  textBytes,
  truncatedJpeg,
  webp,
} from '../../test/fixtures/images.js';
import { ImageRejected, processImage, RENDITIONS } from './image-processor.js';

describe('processImage', () => {
  describe('what counts as an image (FR-010)', () => {
    it.each([
      ['JPEG', () => jpeg()],
      ['PNG', () => pngWithAlpha()],
      ['WebP', () => webp()],
    ])('accepts %s', async (_label, make) => {
      const result = await processImage(await make(), 'dish');
      expect(result.width).toBe(RENDITIONS.dish.width);
    });

    it.each([
      ['plain text under an image name', () => textBytes()],
      ['an SVG', () => svg()],
      ['a GIF', () => gif()],
      ['a truncated JPEG', () => truncatedJpeg()],
      ['an empty buffer', () => Buffer.alloc(0)],
    ])('rejects %s with IS_IMAGE on the file field', async (_label, make) => {
      const error = await processImage(await make(), 'dish').catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ImageRejected);
      expect((error as ImageRejected).code).toBe('IS_IMAGE');
      expect((error as ImageRejected).field).toBe('file');
    });

    it('decides by content, not by what the caller claims', async () => {
      // The bytes are text; nothing in this call says otherwise, and nothing
      // could: the function never sees a filename or a content type.
      await expect(processImage(textBytes(), 'logo')).rejects.toBeInstanceOf(ImageRejected);
    });
  });

  describe('renditions', () => {
    it('stores a logo as a 512×512 PNG', async () => {
      const result = await processImage(await pngWithAlpha(600, 400), 'logo');

      expect(result.contentType).toBe('image/png');
      expect(result.width).toBe(512);
      expect(result.height).toBe(512);

      const stored = await describeImage(result.buffer);
      expect(stored.format).toBe('png');
      expect(stored.width).toBe(512);
      expect(stored.height).toBe(512);
    });

    it('stores a dish photo as a 1600×1200 JPEG', async () => {
      const result = await processImage(await jpeg(2400, 1800), 'dish');

      expect(result.contentType).toBe('image/jpeg');
      const stored = await describeImage(result.buffer);
      expect(stored.format).toBe('jpeg');
      expect(stored.width).toBe(1600);
      expect(stored.height).toBe(1200);
    });

    it('keeps transparency in a logo (FR-013)', async () => {
      const result = await processImage(await pngWithAlpha(600, 400), 'logo');

      const stored = await describeImage(result.buffer);
      expect(stored.hasAlpha).toBe(true);

      // The corners of a circle-on-transparent mark must still be see-through.
      const { data } = await sharp(result.buffer)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      expect(data[3]).toBe(0);
    });

    it('scales an image smaller than the frame up rather than refusing it', async () => {
      const result = await processImage(await webp(200, 150), 'dish');

      const stored = await describeImage(result.buffer);
      expect(stored.width).toBe(1600);
      expect(stored.height).toBe(1200);
    });

    it('strips metadata, so an uploaded photo publishes no EXIF', async () => {
      const result = await processImage(await jpegWithOrientation6(1200, 1600), 'dish');

      const stored = await describeImage(result.buffer);
      // Orientation is baked into the pixels, so no tag should remain claiming
      // the image still needs rotating.
      expect(stored.orientation).toBeUndefined();
    });
  });

  describe('orientation (FR-011)', () => {
    it('bakes EXIF rotation in, so a sideways phone photo is stored upright', async () => {
      // Stored 1200×1600 (portrait) but tagged "rotate 90° to display", so the
      // oriented image is 1600×1200 — landscape, matching the dish frame.
      const result = await processImage(await jpegWithOrientation6(1200, 1600), 'dish');

      const stored = await describeImage(result.buffer);
      expect(stored.width).toBeGreaterThan(stored.height!);
    });

    it('measures the crop against the oriented image, not the stored one', async () => {
      // 1600×1200 after orientation. A crop that is legal only in that space
      // proves the two agree: it would overflow the raw 1200×1600 file.
      const upright = { x: 1300, y: 0, width: 300, height: 225 };

      await expect(
        processImage(await jpegWithOrientation6(1200, 1600), 'dish', upright),
      ).resolves.toBeDefined();
    });
  });

  describe('cropping', () => {
    it('extracts the requested rectangle', async () => {
      // A source whose left half is red and right half is blue: cropping the
      // right half must yield an image that is blue, which is a claim about
      // pixels rather than about dimensions.
      const source = await sharp({
        create: { width: 400, height: 300, channels: 3, background: '#ff0000' },
      })
        .composite([
          {
            input: await sharp({
              create: { width: 200, height: 300, channels: 3, background: '#0000ff' },
            })
              .png()
              .toBuffer(),
            left: 200,
            top: 0,
          },
        ])
        .png()
        .toBuffer();

      const result = await processImage(source, 'dish', { x: 200, y: 0, width: 200, height: 150 });

      const { data } = await sharp(result.buffer).raw().toBuffer({ resolveWithObject: true });
      const [red, green, blue] = [data[0]!, data[1]!, data[2]!];
      expect(blue).toBeGreaterThan(200);
      expect(red).toBeLessThan(60);
      expect(green).toBeLessThan(60);
    });

    it('centre-crops when no rectangle is given, which is the no-JavaScript path', async () => {
      const result = await processImage(await jpeg(3000, 1000), 'dish');

      const stored = await describeImage(result.buffer);
      expect(stored.width).toBe(1600);
      expect(stored.height).toBe(1200);
    });

    it.each([
      ['overflows to the right', { x: 300, y: 0, width: 200, height: 150 }],
      ['overflows downwards', { x: 0, y: 250, width: 200, height: 150 }],
      ['has zero width', { x: 0, y: 0, width: 0, height: 150 }],
      ['has a negative origin', { x: -10, y: 0, width: 100, height: 75 }],
      ['is fractional', { x: 0.5, y: 0, width: 100, height: 75 }],
    ])('rejects a rectangle that %s with IS_CROP on the crop field', async (_label, crop) => {
      const error = await processImage(await jpeg(400, 300), 'dish', crop).catch(
        (caught: unknown) => caught,
      );

      expect(error).toBeInstanceOf(ImageRejected);
      expect((error as ImageRejected).code).toBe('IS_CROP');
      expect((error as ImageRejected).field).toBe('crop');
    });

    it('accepts a rectangle that exactly fills the image', async () => {
      await expect(
        processImage(await jpeg(400, 300), 'dish', { x: 0, y: 0, width: 400, height: 300 }),
      ).resolves.toBeDefined();
    });
  });

  describe('resource limits', () => {
    it('refuses an image far beyond any real camera, as a decompression guard', async () => {
      // 8000×6000 of flat colour is a tiny PNG on disk and 48 MP decoded —
      // over the 40 MP ceiling.
      const bomb = await sharp({
        create: { width: 8000, height: 6000, channels: 3, background: '#ffffff' },
      })
        .png()
        .toBuffer();

      await expect(processImage(bomb, 'dish')).rejects.toBeInstanceOf(ImageRejected);
    });

    it('accepts a 12-megapixel phone photo, which is the realistic ceiling', async () => {
      const photo = await sharp({
        create: {
          width: 4000,
          height: 3000,
          channels: 3,
          noise: { type: 'gaussian', mean: 128, sigma: 30 },
        },
      })
        .jpeg()
        .toBuffer();

      await expect(processImage(photo, 'dish')).resolves.toBeDefined();
    });
  });
});

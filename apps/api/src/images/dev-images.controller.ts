import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Controller, Get, Header, Inject, Param, StreamableFile } from '@nestjs/common';
import { AppError } from '../common/app-error.js';
import { contentTypeForKey, isStorageKey } from './keys.js';
import { IMAGE_STORAGE } from './storage/image-storage.js';
import type { LocalImageStorage } from './storage/local-image-storage.js';
import { IMMUTABLE_CACHE_CONTROL } from './storage/r2-image-storage.js';

/**
 * Serves images from the local disk during development.
 *
 * Registered **only** when the R2 variables are unset. In a deployed
 * environment guests fetch from the bucket's own hostname and this route does
 * not exist, so the API never spends its request loop on image bytes.
 *
 * It exists so that `next/image` has a real URL to optimise against with no
 * bucket configured, which is what lets the entire upload flow — and its
 * end-to-end tests — run offline.
 *
 * Public by design: so are the images it serves. Keys are random UUIDs, so an
 * address is useless to anyone the menu did not give it to.
 */
@Controller('dev-images')
export class DevImagesController {
  constructor(@Inject(IMAGE_STORAGE) private readonly storage: LocalImageStorage) {}

  @Get('*key')
  @Header('Cache-Control', IMMUTABLE_CACHE_CONTROL)
  async serve(@Param('key') segments: string[] | string): Promise<StreamableFile> {
    // Express hands a wildcard back as segments; joining is what turns
    // `["logos", "<uuid>.png"]` back into the key that was stored.
    const key = Array.isArray(segments) ? segments.join('/') : segments;

    // The key becomes a filesystem path, so it is checked here as well as in
    // the adapter: this is the one entry point a stranger can type into.
    if (!isStorageKey(key)) throw AppError.notFound();

    const path = this.storage.resolve(key);
    try {
      await stat(path);
    } catch {
      // A key that was deleted, or never existed. The guest page falls back to
      // its no-image presentation on a failed load, so a 404 here is a
      // supported outcome rather than a broken page.
      throw AppError.notFound();
    }

    return new StreamableFile(createReadStream(path), {
      type: contentTypeForKey(key),
    });
  }
}

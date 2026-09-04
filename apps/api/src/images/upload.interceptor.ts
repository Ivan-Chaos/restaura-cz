import { UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MAX_UPLOAD_BYTES } from './limits.js';

/**
 * Accepts one image part named `file`.
 *
 * No `storage` and no `dest`, which is multer's documented way of saying "keep
 * it in memory": the buffer goes straight into the processor and the result
 * straight into object storage, so a temporary file would be a third copy
 * nobody reads and one more thing to clean up after a crash.
 *
 * Size is enforced here, before the handler runs — multer aborts the stream
 * rather than reading 200 MB into memory to discover it is too large. The
 * resulting `PayloadTooLargeException` is translated into the contract's
 * validation shape by `HttpErrorFilter`, so the form marks the image field
 * instead of showing a bare 413.
 *
 * What is *not* enforced here is what the file actually is: multer sees only a
 * declared content type and a filename, both of which the caller chooses.
 * `processImage` decides that, by decoding the bytes.
 */
export function ImageUpload(): MethodDecorator {
  return UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
    }),
  );
}

export { MAX_UPLOAD_BYTES } from './limits.js';

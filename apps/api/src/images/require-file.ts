import { ImageRejected } from './image-processor.js';

/** What multer hands a handler for the accepted part. */
export interface UploadedImage {
  buffer: Buffer;
  size: number;
}

/**
 * Insists the request actually carried a file.
 *
 * A body with no `file` part is reported as `IS_IMAGE` rather than as a missing
 * field, because to the owner the two are the same event — nothing usable
 * arrived — and one message is easier to act on than two that read alike.
 */
export function requireFile(file: UploadedImage | undefined): UploadedImage {
  if (!file || file.buffer.byteLength === 0) {
    throw ImageRejected.notAnImage('no image was uploaded');
  }
  return file;
}

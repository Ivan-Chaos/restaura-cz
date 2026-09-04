import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { ImageStorage, StoredObject } from './image-storage.js';

/**
 * Cloudflare R2, through its S3-compatible API.
 *
 * Only three operations are used, and they are the most stable corner of that
 * API. Region is `auto` because R2 has no regions; the endpoint is the account's
 * own, and reads never come through here — guests fetch from the bucket's public
 * hostname, which is what `publicUrl` builds.
 *
 * Objects are written immutable and cached for a year. That is safe because a
 * key is never reused: replacing an image writes a new random key and deletes
 * the old one, so there is no cache anywhere that can serve a stale rendition.
 */
export const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

/** S3 caps a single delete request at 1000 keys. */
const DELETE_CHUNK = 1000;

export interface R2Options {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  /** Public base URL, without a trailing slash. */
  publicUrl: string;
}

export class R2ImageStorage implements ImageStorage {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly baseUrl: string;

  constructor(options: R2Options, client?: S3Client) {
    this.bucket = options.bucket;
    this.baseUrl = options.publicUrl;
    this.client =
      client ??
      new S3Client({
        region: 'auto',
        endpoint: `https://${options.accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: options.accessKeyId,
          secretAccessKey: options.secretAccessKey,
        },
      });
  }

  /**
   * Every SDK call goes through here so a failure names the operation and the
   * key it was working on. The alternative — letting an SDK error propagate —
   * produces a stack trace that says a request failed without saying which
   * object, which is exactly the detail an operator needs.
   */
  private async attempt<T>(operation: string, key: string, run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (cause) {
      throw new Error(`R2 ${operation} failed for "${key}" in bucket "${this.bucket}".`, {
        cause,
      });
    }
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.attempt('put', key, () =>
      this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          CacheControl: IMMUTABLE_CACHE_CONTROL,
        }),
      ),
    );
  }

  async delete(keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    for (let index = 0; index < keys.length; index += DELETE_CHUNK) {
      const chunk = keys.slice(index, index + DELETE_CHUNK);
      await this.attempt('delete', chunk[0] ?? '', () =>
        this.client.send(
          new DeleteObjectsCommand({
            Bucket: this.bucket,
            Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true },
          }),
        ),
      );
    }
  }

  publicUrl(key: string): string {
    return `${this.baseUrl}/${key}`;
  }

  async *list(prefix: string): AsyncIterable<StoredObject> {
    let continuationToken: string | undefined;

    do {
      const page = await this.attempt('list', prefix, () =>
        this.client.send(
          new ListObjectsV2Command({
            Bucket: this.bucket,
            Prefix: prefix,
            ContinuationToken: continuationToken,
          }),
        ),
      );

      for (const object of page.Contents ?? []) {
        if (object.Key === undefined) continue;
        yield { key: object.Key, lastModified: object.LastModified ?? new Date(0) };
      }

      continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (continuationToken !== undefined);
  }
}

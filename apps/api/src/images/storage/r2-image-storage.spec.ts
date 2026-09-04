import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  type S3Client,
} from '@aws-sdk/client-s3';
import { describe, expect, it, vi } from 'vitest';
import { IMMUTABLE_CACHE_CONTROL, R2ImageStorage } from './r2-image-storage.js';

const OPTIONS = {
  accountId: 'acc123',
  accessKeyId: 'key123',
  secretAccessKey: 'secret123',
  bucket: 'restaura-images',
  publicUrl: 'https://img.example.com',
};

/**
 * The SDK's `send` is the seam. Asserting on the command inputs proves the
 * bucket, key, cache header and paging are right without a network round trip —
 * the parts that would silently misbehave against a real bucket.
 */
function storageWith(send: ReturnType<typeof vi.fn>) {
  return new R2ImageStorage(OPTIONS, { send } as unknown as S3Client);
}

describe('R2ImageStorage', () => {
  it('writes with the object content type and an immutable cache header', async () => {
    const send = vi.fn().mockResolvedValue({});
    await storageWith(send).put('logos/abc.png', Buffer.from('bytes'), 'image/png');

    const command = send.mock.calls[0]?.[0];
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toMatchObject({
      Bucket: 'restaura-images',
      Key: 'logos/abc.png',
      ContentType: 'image/png',
      CacheControl: IMMUTABLE_CACHE_CONTROL,
    });
  });

  it('deletes in one request', async () => {
    const send = vi.fn().mockResolvedValue({});
    await storageWith(send).delete(['logos/a.png', 'dishes/b.jpg']);

    const command = send.mock.calls[0]?.[0];
    expect(command).toBeInstanceOf(DeleteObjectsCommand);
    expect(command.input.Delete.Objects).toEqual([
      { Key: 'logos/a.png' },
      { Key: 'dishes/b.jpg' },
    ]);
  });

  it('chunks a delete larger than the API allows', async () => {
    const send = vi.fn().mockResolvedValue({});
    const keys = Array.from({ length: 2500 }, (_, index) => `dishes/${index}.jpg`);

    await storageWith(send).delete(keys);

    expect(send).toHaveBeenCalledTimes(3);
    expect(send.mock.calls[0]?.[0].input.Delete.Objects).toHaveLength(1000);
    expect(send.mock.calls[2]?.[0].input.Delete.Objects).toHaveLength(500);
  });

  it('sends nothing when there is nothing to delete', async () => {
    const send = vi.fn().mockResolvedValue({});
    await storageWith(send).delete([]);
    expect(send).not.toHaveBeenCalled();
  });

  it('follows every page when listing', async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({
        Contents: [{ Key: 'dishes/a.jpg', LastModified: new Date('2026-01-01') }],
        IsTruncated: true,
        NextContinuationToken: 'page-2',
      })
      .mockResolvedValueOnce({
        Contents: [{ Key: 'dishes/b.jpg', LastModified: new Date('2026-01-02') }],
        IsTruncated: false,
      });

    const listed = [];
    for await (const object of storageWith(send).list('dishes/')) listed.push(object.key);

    expect(listed).toEqual(['dishes/a.jpg', 'dishes/b.jpg']);
    expect(send.mock.calls[0]?.[0]).toBeInstanceOf(ListObjectsV2Command);
    expect(send.mock.calls[1]?.[0].input.ContinuationToken).toBe('page-2');
  });

  it('builds a public URL from the bucket hostname, never the S3 endpoint', () => {
    expect(storageWith(vi.fn()).publicUrl('logos/abc.png')).toBe(
      'https://img.example.com/logos/abc.png',
    );
  });

  it('names the operation and key when a call fails', async () => {
    const send = vi.fn().mockRejectedValue(new Error('connection reset'));

    await expect(
      storageWith(send).put('logos/abc.png', Buffer.from('x'), 'image/png'),
    ).rejects.toThrow(/R2 put failed for "logos\/abc.png" in bucket "restaura-images"/);
  });
});

import { HttpStatus, NotFoundException, PayloadTooLargeException } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ImageRejected } from '../images/image-processor.js';
import { AppError, type ErrorBody } from './app-error.js';
import { HttpErrorFilter } from './http-error.filter.js';

/**
 * The filter is the one place every non-2xx answer is shaped, so the frontend
 * can rely on a single contract. These cases are the branches that would
 * otherwise leak a different shape to a form that is expecting field errors.
 */
function capture(exception: unknown): { status: number; body: ErrorBody } {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;

  new HttpErrorFilter().catch(exception, host);

  return { status: status.mock.calls[0]?.[0] as number, body: json.mock.calls[0]?.[0] as ErrorBody };
}

describe('HttpErrorFilter', () => {
  it('passes an AppError through with its code and details', () => {
    const { status, body } = capture(AppError.notFound());

    expect(status).toBe(HttpStatus.NOT_FOUND);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  describe('uploads (feature 006)', () => {
    it('reports an unreadable image as a rejected file field', () => {
      const { status, body } = capture(ImageRejected.notAnImage('format "gif" is not supported'));

      expect(status).toBe(HttpStatus.BAD_REQUEST);
      expect(body.error.code).toBe('VALIDATION_FAILED');
      expect(body.error.details).toEqual([
        expect.objectContaining({ field: 'file', code: 'IS_IMAGE' }),
      ]);
    });

    it('reports an impossible crop against the crop field', () => {
      const { body } = capture(ImageRejected.badCrop('does not fit'));

      expect(body.error.details).toEqual([
        expect.objectContaining({ field: 'crop', code: 'IS_CROP' }),
      ]);
    });

    it('translates a 413 into a field error, so the form can mark the image', () => {
      const { status, body } = capture(new PayloadTooLargeException());

      expect(status).toBe(HttpStatus.BAD_REQUEST);
      expect(body.error.code).toBe('VALIDATION_FAILED');
      expect(body.error.details).toEqual([
        expect.objectContaining({ field: 'file', code: 'MAX_FILE_SIZE' }),
      ]);
      expect(body.error.details?.[0]?.message).toMatch(/10 MB/);
    });

    it("translates multer's own size error the same way", () => {
      const { status, body } = capture(
        Object.assign(new Error('File too large'), { code: 'LIMIT_FILE_SIZE' }),
      );

      expect(status).toBe(HttpStatus.BAD_REQUEST);
      expect(body.error.details).toEqual([
        expect.objectContaining({ field: 'file', code: 'MAX_FILE_SIZE' }),
      ]);
    });
  });

  it('maps a Nest exception onto the closest contract code', () => {
    const { status, body } = capture(new NotFoundException());

    expect(status).toBe(HttpStatus.NOT_FOUND);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('tells the caller nothing about an unplanned failure', () => {
    const { status, body } = capture(new Error('connection string leaked here'));

    expect(status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(body.error.code).toBe('INTERNAL');
    expect(body.error.message).toBe('Internal server error.');
  });
});

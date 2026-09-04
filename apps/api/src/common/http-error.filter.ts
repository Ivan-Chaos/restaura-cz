import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  PayloadTooLargeException,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import { ImageRejected } from '../images/image-processor.js';
import { MAX_UPLOAD_MEGABYTES } from '../images/limits.js';
import { AppError, type ErrorBody, type ErrorCode } from './app-error.js';

/**
 * Multer's own size error, in case it reaches the filter unwrapped rather than
 * as Nest's `PayloadTooLargeException`. Checked by code because the class lives
 * inside multer and is not exported for an `instanceof`.
 */
function isMulterFileTooLarge(exception: unknown): boolean {
  return (
    typeof exception === 'object' &&
    exception !== null &&
    (exception as { code?: unknown }).code === 'LIMIT_FILE_SIZE'
  );
}

/**
 * Every non-2xx response leaves through here, so the frontend can rely on one
 * shape and render errors consistently instead of special-casing per endpoint.
 */
@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, body } = this.describe(exception);
    response.status(status).json(body);
  }

  private describe(exception: unknown): { status: number; body: ErrorBody } {
    if (exception instanceof AppError) {
      return {
        status: exception.getStatus(),
        body: {
          error: {
            code: exception.code,
            message: exception.message,
            ...(exception.details ? { details: exception.details } : {}),
          },
        },
      };
    }

    // A rejected upload is a rejected field, not a category of its own, so it
    // leaves through the same shape a bad price does (feature 006).
    if (exception instanceof ImageRejected) {
      const error = AppError.fileRejected(exception.field, exception.code, exception.message);
      return {
        status: error.getStatus(),
        body: {
          error: {
            code: error.code,
            message: error.message,
            ...(error.details ? { details: error.details } : {}),
          },
        },
      };
    }

    /**
     * Multer aborts an oversized upload before the handler runs, and Nest
     * surfaces that as a 413. Translated here rather than left alone so the
     * form can mark the image field and show a translated message, like every
     * other validation failure.
     */
    if (exception instanceof PayloadTooLargeException || isMulterFileTooLarge(exception)) {
      const error = AppError.fileRejected(
        'file',
        'MAX_FILE_SIZE',
        `Upload exceeds the ${MAX_UPLOAD_MEGABYTES} MB limit.`,
      );
      return {
        status: error.getStatus(),
        body: {
          error: {
            code: error.code,
            message: error.message,
            ...(error.details ? { details: error.details } : {}),
          },
        },
      };
    }

    // Exceptions Nest raises on our behalf: unmatched routes, payload limits,
    // guards that throw the built-in types.
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return {
        status,
        body: { error: { code: this.codeForStatus(status), message: exception.message } },
      };
    }

    // Anything unplanned is a bug. Log it in full, tell the caller nothing.
    this.logger.error('Unhandled exception', exception instanceof Error ? exception.stack : exception);
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: { error: { code: 'INTERNAL', message: 'Internal server error.' } },
    };
  }

  private codeForStatus(status: number): ErrorCode {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'VALIDATION_FAILED';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHENTICATED';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      default:
        return 'INTERNAL';
    }
  }
}

import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import { AppError, type ErrorBody, type ErrorCode } from './app-error.js';

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

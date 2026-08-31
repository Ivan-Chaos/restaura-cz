import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * The closed set of error codes the API returns. The frontend renders a
 * translated message per code, so adding one here is a contract change:
 * update specs/001-menu-creation-publishing/contracts/http-api.md and the
 * frontend's message catalogues in the same change set.
 */
export type ErrorCode =
  | 'VALIDATION_FAILED'
  | 'UNAUTHENTICATED'
  | 'EMAIL_TAKEN'
  | 'INVALID_CREDENTIALS'
  | 'NOT_FOUND'
  | 'INTERNAL';

/** One failed field, for forms to attach messages to the right input. */
export interface FieldError {
  field: string;
  /** Constraint name in UPPER_SNAKE, e.g. IS_EMAIL, MIN_LENGTH. */
  code: string;
  message: string;
}

export interface ErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    details?: FieldError[];
  };
}

/**
 * `message` is developer-facing. Users never see it — the frontend translates
 * `code` — so it may be specific without leaking internals.
 */
export class AppError extends HttpException {
  constructor(
    readonly code: ErrorCode,
    status: HttpStatus,
    message: string,
    readonly details?: FieldError[],
  ) {
    super(message, status);
  }

  static validationFailed(details: FieldError[]): AppError {
    return new AppError(
      'VALIDATION_FAILED',
      HttpStatus.BAD_REQUEST,
      'Request body failed validation.',
      details,
    );
  }

  static unauthenticated(): AppError {
    return new AppError('UNAUTHENTICATED', HttpStatus.UNAUTHORIZED, 'No valid session.');
  }

  /** Deliberately identical for an unknown email and a wrong password. */
  static invalidCredentials(): AppError {
    return new AppError(
      'INVALID_CREDENTIALS',
      HttpStatus.UNAUTHORIZED,
      'Email or password is incorrect.',
    );
  }

  static emailTaken(): AppError {
    return new AppError('EMAIL_TAKEN', HttpStatus.CONFLICT, 'An account with this email exists.');
  }

  /**
   * Also the answer when a resource exists but belongs to someone else: a 403
   * would confirm it exists.
   */
  static notFound(): AppError {
    return new AppError('NOT_FOUND', HttpStatus.NOT_FOUND, 'Resource not found.');
  }
}

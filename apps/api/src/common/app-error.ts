import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * The closed set of error codes the API returns. The frontend renders a
 * translated message per code, so adding one here is a contract change:
 * update specs/001-menu-creation-publishing/contracts/http-api.md (and its
 * amendments under specs/00{2,3}-*) and the frontend's message catalogues in
 * the same change set.
 */
export type ErrorCode =
  | 'VALIDATION_FAILED'
  | 'UNAUTHENTICATED'
  | 'EMAIL_TAKEN'
  | 'INVALID_CREDENTIALS'
  | 'NOT_FOUND'
  | 'INTERNAL'
  | 'CODE_INVALID'
  | 'CODE_EXPIRED'
  | 'TOO_MANY_ATTEMPTS'
  | 'EMAIL_UNVERIFIED';

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

  /**
   * A well-formed code that is simply wrong. Distinct from CODE_EXPIRED so the
   * form can tell the owner whether to look harder at the email they have or
   * ask for a new one — advice that is useless if both cases read the same.
   */
  static codeInvalid(): AppError {
    return new AppError(
      'CODE_INVALID',
      HttpStatus.BAD_REQUEST,
      'Confirmation code is incorrect.',
    );
  }

  /** Also the answer when no code was ever issued: both mean "ask for a new one". */
  static codeExpired(): AppError {
    return new AppError(
      'CODE_EXPIRED',
      HttpStatus.BAD_REQUEST,
      'Confirmation code has expired or was never issued.',
    );
  }

  /** Covers both a guessed-out code and a resend asked for too soon. */
  static tooManyAttempts(): AppError {
    return new AppError(
      'TOO_MANY_ATTEMPTS',
      HttpStatus.TOO_MANY_REQUESTS,
      'Too many attempts. Request a new code and wait before retrying.',
    );
  }

  /**
   * A valid session belonging to an account that has not confirmed its email.
   * 403 rather than 401: the credentials are fine, the account is not yet
   * allowed to do this.
   */
  static emailUnverified(): AppError {
    return new AppError(
      'EMAIL_UNVERIFIED',
      HttpStatus.FORBIDDEN,
      'Email address has not been confirmed.',
    );
  }
}

import { ValidationPipe } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import { AppError, type FieldError } from './app-error.js';

/** `minLength` -> `MIN_LENGTH`, so the frontend can key a translation off it. */
function toConstraintCode(constraintName: string): string {
  return constraintName
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toUpperCase();
}

function flatten(errors: ValidationError[], parentPath = ''): FieldError[] {
  return errors.flatMap((error) => {
    const field = parentPath === '' ? error.property : `${parentPath}.${error.property}`;
    const own = Object.entries(error.constraints ?? {}).map(([name, message]) => ({
      field,
      code: toConstraintCode(name),
      message,
    }));
    const nested = error.children?.length ? flatten(error.children, field) : [];
    return [...own, ...nested];
  });
}

/**
 * Rejects unknown properties outright rather than stripping them silently: a
 * request carrying a field we do not understand is a caller bug worth surfacing.
 */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
    exceptionFactory: (errors: ValidationError[]) => AppError.validationFailed(flatten(errors)),
  });
}

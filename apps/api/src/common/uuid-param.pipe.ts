import { ParseUUIDPipe } from '@nestjs/common';
import { AppError } from './app-error.js';

/**
 * For a path id, "not a valid uuid" and "no such record" are the same answer to
 * the caller: it is not theirs. Answering 404 for both keeps the id format from
 * being probed and matches how a missing menu behaves.
 */
export const UuidParam = new ParseUUIDPipe({
  exceptionFactory: () => AppError.notFound(),
});

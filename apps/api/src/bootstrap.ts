import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { HttpErrorFilter } from './common/http-error.filter.js';
import { createValidationPipe } from './common/validation.js';

/**
 * Shared by the server and the integration tests, so tests exercise the same
 * validation and error formatting real callers get.
 */
export function configureApp(app: INestApplication): void {
  app.use(cookieParser());
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new HttpErrorFilter());
  app.enableShutdownHooks();
}

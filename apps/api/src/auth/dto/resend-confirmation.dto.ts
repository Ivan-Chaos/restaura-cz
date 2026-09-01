import { IsIn, IsOptional } from 'class-validator';
import { EMAIL_LOCALES } from '../../mail/mail.service.js';

/**
 * Which language to write the email in.
 *
 * Declared even though it is optional because the global ValidationPipe runs
 * with `forbidNonWhitelisted`: an undeclared property is a 400, so the frontend
 * could not send the locale it already knows without this class.
 */
export class ResendConfirmationDto {
  @IsOptional()
  @IsIn(EMAIL_LOCALES)
  locale?: (typeof EMAIL_LOCALES)[number];
}

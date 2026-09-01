import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { EMAIL_LOCALES } from '../../mail/mail.service.js';
import { ProfileDto } from './profile.dto.js';

/**
 * Registration creates the account and its restaurant profile together, so the
 * body carries both. Extending `ProfileDto` rather than restating its fields
 * keeps one definition of what a valid profile is — the settings form applies
 * the very same rules through the same class.
 *
 * There is deliberately no `confirmPassword` here. Confirming a typed password
 * is the form's job; the API storing and comparing a second copy of the secret
 * would add exposure for no integrity gain.
 */
export class SignUpDto extends ProfileDto {
  /**
   * Trimmed before validation: a trailing space pasted from a password manager
   * would otherwise create an account whose address the owner cannot sign in
   * with, since sign-in compares the trimmed form.
   */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsEmail({}, { message: 'must be a valid email address' })
  @MaxLength(254)
  email!: string;

  /**
   * The lower bound is the product rule (FR-002); the upper bound stops a
   * multi-megabyte string from becoming an expensive hash.
   */
  @IsString()
  @Length(8, 128)
  password!: string;

  /**
   * Which language to send the confirmation email in. Optional so a caller
   * that does not care gets Czech, and declared because the ValidationPipe
   * rejects undeclared properties outright.
   */
  @IsOptional()
  @IsIn(EMAIL_LOCALES)
  locale?: (typeof EMAIL_LOCALES)[number];
}

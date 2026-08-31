import { IsEmail, IsString, Length, MaxLength } from 'class-validator';
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
}

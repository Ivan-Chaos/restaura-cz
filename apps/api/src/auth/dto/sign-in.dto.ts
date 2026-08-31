import { IsEmail, IsString, MaxLength } from 'class-validator';

export class SignInDto {
  @IsEmail({}, { message: 'must be a valid email address' })
  @MaxLength(254)
  email!: string;

  /**
   * No minimum length here on purpose: a too-short password is a wrong
   * password, and must come back as 401 like every other wrong password rather
   * than as a validation error that hints at the rule.
   */
  @IsString()
  @MaxLength(128)
  password!: string;
}

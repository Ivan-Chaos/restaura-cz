import { IsString, Matches } from 'class-validator';
import { CODE_LENGTH } from '../email-confirmation.js';

/**
 * The submitted confirmation code.
 *
 * Shape only — whether the code is *right* is not a validation question, it is
 * the endpoint's entire purpose, and answering it needs the database. A
 * malformed code is a 400 VALIDATION_FAILED; a wrong one is CODE_INVALID.
 */
export class VerifyEmailDto {
  @IsString()
  @Matches(new RegExp(`^\\d{${CODE_LENGTH}}$`), {
    message: `must be ${CODE_LENGTH} digits`,
  })
  code!: string;
}

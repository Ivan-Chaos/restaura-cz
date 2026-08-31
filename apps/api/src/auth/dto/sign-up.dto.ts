import { IsEmail, IsString, Length, MaxLength } from 'class-validator';

export class SignUpDto {
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

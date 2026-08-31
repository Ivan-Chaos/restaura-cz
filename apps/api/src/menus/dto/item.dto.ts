import { IsEmpty, IsInt, IsOptional, IsString, Length, MaxLength, Min } from 'class-validator';
import { AtLeastOneOf } from '../../common/validators.js';

export class CreateItemDto {
  @IsString()
  @Length(1, 200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  /** Whole korunas. Non-negative is also a database constraint. */
  @IsInt()
  @Min(0)
  priceCzk!: number;
}

export class UpdateItemDto {
  @IsOptional()
  @IsString()
  @Length(1, 200)
  name?: string;

  /**
   * Explicit null clears the description; an absent key leaves it untouched.
   * `@IsOptional` skips validation for both null and undefined, which is
   * exactly the distinction the service acts on.
   */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceCzk?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  /** See UpdateMenuDto.change — carries the "at least one change" rule. */
  @IsEmpty()
  @AtLeastOneOf(['name', 'description', 'priceCzk', 'position'])
  readonly change?: never;
}

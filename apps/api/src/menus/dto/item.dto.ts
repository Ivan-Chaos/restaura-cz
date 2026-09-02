import { IsEmpty, IsInt, IsNumber, IsOptional, IsString, Length, MaxLength, Min } from 'class-validator';
import { AtLeastOneOf } from '../../common/validators.js';

/**
 * Prices are korunas with at most two decimal places — 89 and 56.5 are both
 * valid, 56.555 is not. `@IsNumber` reports both the type failure and the
 * decimal-places failure under the same `IS_NUMBER` code, which is what the
 * frontend translates into "enter a price such as 89 or 56,50": the two
 * problems have the same fix, so they do not need separate wording.
 */
export class CreateItemDto {
  @IsString()
  @Length(1, 200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
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
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  priceCzk?: number;

  /** A place in the list, so this one stays a whole number. */
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  /** See UpdateMenuDto.change — carries the "at least one change" rule. */
  @IsEmpty()
  @AtLeastOneOf(['name', 'description', 'priceCzk', 'position'])
  readonly change?: never;
}

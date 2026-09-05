import {
  ArrayMaxSize,
  IsArray,
  IsEmpty,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { AtLeastOneOf, OptionalButNotNull } from '../../common/validators.js';
import {
  ALLERGEN_NUMBERS,
  AVAILABILITIES,
  DIETARY_IDS,
  MAX_SPICE_LEVEL,
  WARNING_IDS,
  type AllergenNumber,
  type Availability,
  type DietaryId,
  type WarningId,
} from '../item-attributes.js';

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

  /**
   * Optional on the wire and defaulted in the database, so a caller that has
   * never heard of dietary markers keeps working unchanged.
   *
   * `each: true` reports a bad entry against `dietary.<index>`, which is what
   * lets the form mark the one offending checkbox rather than the whole group —
   * the same reasoning as `ProfileDto.phones`.
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @IsIn(DIETARY_IDS, { each: true })
  dietary?: DietaryId[];

  /**
   * `@IsInt` before `@IsIn` on purpose: a form posting "3" instead of 3 fails
   * both, and the frontend's CODE_PRIORITY prefers the type problem — "must be
   * a whole number" is the useful half.
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(14)
  @IsInt({ each: true })
  @IsIn(ALLERGEN_NUMBERS, { each: true })
  allergens?: AllergenNumber[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_SPICE_LEVEL)
  spiceLevel?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsIn(WARNING_IDS, { each: true })
  warnings?: WarningId[];

  @IsOptional()
  @IsIn(AVAILABILITIES)
  availability?: Availability;
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

  /**
   * `[]` clears the set; an absent key leaves it untouched; `null` is a 400.
   *
   * The column is NOT NULL with a `{}` default, so "no markers" already has
   * exactly one spelling and a second would only be a way to get it wrong. That
   * is the difference from `description` above, whose column really is nullable
   * — hence `@IsOptional` there and `@OptionalButNotNull` here, which lets a
   * null through to the validators instead of past them.
   */
  @OptionalButNotNull()
  @IsArray()
  @ArrayMaxSize(7)
  @IsIn(DIETARY_IDS, { each: true })
  dietary?: DietaryId[];

  @OptionalButNotNull()
  @IsArray()
  @ArrayMaxSize(14)
  @IsInt({ each: true })
  @IsIn(ALLERGEN_NUMBERS, { each: true })
  allergens?: AllergenNumber[];

  @OptionalButNotNull()
  @IsInt()
  @Min(0)
  @Max(MAX_SPICE_LEVEL)
  spiceLevel?: number;

  @OptionalButNotNull()
  @IsArray()
  @ArrayMaxSize(5)
  @IsIn(WARNING_IDS, { each: true })
  warnings?: WarningId[];

  @OptionalButNotNull()
  @IsIn(AVAILABILITIES)
  availability?: Availability;

  /** See UpdateMenuDto.change — carries the "at least one change" rule. */
  @IsEmpty()
  @AtLeastOneOf([
    'name',
    'description',
    'priceCzk',
    'position',
    'dietary',
    'allergens',
    'spiceLevel',
    'warnings',
    'availability',
  ])
  readonly change?: never;
}

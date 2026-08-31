import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsString, Length } from 'class-validator';
import { IsPhone } from '../../common/validators.js';

/** Trims a string field before validation, so "  " is empty, not one character. */
const trimmed = (): PropertyDecorator =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

/**
 * The restaurant profile's field rules, in one place.
 *
 * Registration and the settings form apply exactly the same rules — the spec
 * requires it — so they share this class rather than each declaring its own
 * copy that could drift.
 */
export class ProfileDto {
  @trimmed()
  @IsString()
  @Length(1, 120)
  restaurantName!: string;

  /**
   * `each: true` reports a bad entry against `phones.<index>`, which is what
   * lets the form mark the offending input rather than the whole group.
   */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value.map((entry: unknown) => (typeof entry === 'string' ? entry.trim() : entry))
      : value,
  )
  @IsPhone({ each: true })
  phones!: string[];

  @trimmed()
  @IsString()
  @Length(1, 200)
  location!: string;
}

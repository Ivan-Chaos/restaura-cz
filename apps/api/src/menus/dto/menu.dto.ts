import { IsEmpty, IsIn, IsOptional, IsString, Length } from 'class-validator';
import { AtLeastOneOf, OptionalButNotNull } from '../../common/validators.js';
import { VISUAL_VARIANTS } from '../visual-variants.js';

export class CreateMenuDto {
  @IsString()
  @Length(1, 120)
  name!: string;
}

export class UpdateMenuDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  name?: string;

  /**
   * `@OptionalButNotNull` rather than `@IsOptional`: the column is NOT NULL
   * with a default, and `@IsOptional` waves `null` past every validator below
   * it, so `{ "visualVariant": null }` reached the UPDATE and came back as a
   * 500. There is no such thing as "no visual variant" — there is only the
   * default one.
   */
  @OptionalButNotNull()
  @IsIn(VISUAL_VARIANTS)
  visualVariant?: string;

  /**
   * Not a field callers send. It carries the "at least one change" rule, which
   * cannot sit on an optional property: `@IsOptional()` skips every validator
   * on a property that is undefined, including this one. `@IsEmpty()` rejects
   * anyone who does send it.
   */
  @IsEmpty()
  @AtLeastOneOf(['name', 'visualVariant'])
  readonly change?: never;
}

import { IsEmpty, IsIn, IsOptional, IsString, Length } from 'class-validator';
import { AtLeastOneOf } from '../../common/validators.js';
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

  @IsOptional()
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

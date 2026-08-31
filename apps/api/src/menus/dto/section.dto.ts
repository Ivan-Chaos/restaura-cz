import { IsEmpty, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';
import { AtLeastOneOf } from '../../common/validators.js';

export class CreateSectionDto {
  @IsString()
  @Length(1, 120)
  title!: string;
}

export class UpdateSectionDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  title?: string;

  /** Clamped to the current sibling count by the service. */
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  /** See UpdateMenuDto.change — carries the "at least one change" rule. */
  @IsEmpty()
  @AtLeastOneOf(['title', 'position'])
  readonly change?: never;
}

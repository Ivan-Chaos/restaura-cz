import { Type } from 'class-transformer';
import { IsEmpty, IsInt, IsOptional, Min } from 'class-validator';
import { AllOrNoneOf } from '../../common/validators.js';
import type { CropRect } from '../image-processor.js';

/**
 * The framing an owner chose, as it arrives on a multipart request.
 *
 * Every part of a multipart body is a string, and the global validation pipe
 * runs with `enableImplicitConversion: false` on purpose — it is what keeps a
 * price of `"56,50"` from being silently coerced. So each coordinate converts
 * explicitly here rather than relying on the pipe.
 *
 * Coordinates are in **oriented** source pixels: what the owner saw in the crop
 * frame, after the browser applied any EXIF rotation. The processor orients
 * before measuring, so both sides describe the same image.
 *
 * All four or none. A partial rectangle is rejected rather than ignored,
 * because ignoring it would quietly store a centre-crop while the owner
 * believed they had chosen a framing.
 */
export class CropDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  cropX?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  cropY?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cropWidth?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cropHeight?: number;

  /**
   * Not a field callers send. It carries the all-or-none rule, which cannot sit
   * on an optional property: `@IsOptional()` skips every validator on a
   * property that is undefined, including this one. Reported under `crop` with
   * the constraint code `IS_CROP`, which is what the form marks.
   */
  @IsEmpty()
  @AllOrNoneOf(['cropX', 'cropY', 'cropWidth', 'cropHeight'])
  readonly crop?: never;
}

/** The rectangle, or `undefined` when the owner sent none (centre-crop). */
export function toCropRect(dto: CropDto): CropRect | undefined {
  const { cropX, cropY, cropWidth, cropHeight } = dto;

  if (
    cropX === undefined ||
    cropY === undefined ||
    cropWidth === undefined ||
    cropHeight === undefined
  ) {
    return undefined;
  }

  return { x: cropX, y: cropY, width: cropWidth, height: cropHeight };
}

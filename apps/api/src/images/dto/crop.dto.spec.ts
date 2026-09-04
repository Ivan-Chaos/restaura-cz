import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CropDto, toCropRect } from './crop.dto.js';

/**
 * Multipart bodies arrive as strings and the pipe does not convert implicitly,
 * so the conversion and the all-or-none rule are the two things worth pinning.
 */
function validate(body: Record<string, unknown>) {
  const dto = plainToInstance(CropDto, body);
  const errors = validateSync(dto, { whitelist: true, forbidNonWhitelisted: true });
  return {
    dto,
    codes: errors.flatMap((error) =>
      Object.keys(error.constraints ?? {}).map((name) => `${error.property}:${name}`),
    ),
  };
}

describe('CropDto', () => {
  it('accepts a body with no crop at all, which is the no-JavaScript path', () => {
    const { codes, dto } = validate({});

    expect(codes).toEqual([]);
    expect(toCropRect(dto)).toBeUndefined();
  });

  it('converts the four string parts a multipart body carries', () => {
    const { codes, dto } = validate({
      cropX: '120',
      cropY: '40',
      cropWidth: '800',
      cropHeight: '600',
    });

    expect(codes).toEqual([]);
    expect(toCropRect(dto)).toEqual({ x: 120, y: 40, width: 800, height: 600 });
  });

  it.each([
    ['only the origin', { cropX: '10', cropY: '10' }],
    ['three of four', { cropX: '10', cropY: '10', cropWidth: '100' }],
    ['only a size', { cropWidth: '100', cropHeight: '75' }],
  ])('rejects %s under the crop field', (_label, body) => {
    const { codes } = validate(body);
    expect(codes).toContain('crop:isCrop');
  });

  it('rejects a fractional coordinate', () => {
    const { codes } = validate({
      cropX: '10.5',
      cropY: '0',
      cropWidth: '100',
      cropHeight: '75',
    });

    expect(codes).toContain('cropX:isInt');
  });

  it('rejects a negative origin', () => {
    const { codes } = validate({
      cropX: '-5',
      cropY: '0',
      cropWidth: '100',
      cropHeight: '75',
    });

    expect(codes).toContain('cropX:min');
  });

  it('rejects a zero-sized rectangle', () => {
    const { codes } = validate({
      cropX: '0',
      cropY: '0',
      cropWidth: '0',
      cropHeight: '75',
    });

    expect(codes).toContain('cropWidth:min');
  });

  it('rejects a coordinate that is not a number at all', () => {
    const { codes } = validate({
      cropX: 'left',
      cropY: '0',
      cropWidth: '100',
      cropHeight: '75',
    });

    expect(codes).toContain('cropX:isInt');
  });

  it('refuses a caller who sends the rule-carrying property itself', () => {
    const { codes } = validate({ crop: 'anything' });
    expect(codes).toContain('crop:isEmpty');
  });
});

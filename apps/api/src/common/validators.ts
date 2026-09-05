import {
  registerDecorator,
  ValidateIf,
  ValidatorConstraint,
  type ValidationArguments,
  type ValidationOptions,
  type ValidatorConstraintInterface,
} from 'class-validator';

/**
 * `@IsOptional()` for a column that cannot be null.
 *
 * class-validator's `@IsOptional` skips every validator below it when the value
 * is `null` *or* `undefined`. That is right for a nullable column — it is why
 * `description: null` clears a description — and wrong for a NOT NULL one: the
 * null sails past validation, reaches the UPDATE, and comes back to the caller
 * as a 23502 dressed up as a 500.
 *
 * This skips only the absent case, so `null` reaches the validators below it
 * and is answered with an honest 400. `ValidateIf` registers property metadata,
 * so `whitelist: true` still recognises the property and will not strip it.
 */
export function OptionalButNotNull(): PropertyDecorator {
  return ValidateIf((_object: unknown, value: unknown) => value !== undefined);
}

@ValidatorConstraint({ name: 'atLeastOneDefined', async: false })
class AtLeastOneDefinedConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const object = args.object as Record<string, unknown>;
    return (args.constraints as string[]).some((field) => object[field] !== undefined);
  }

  defaultMessage(args: ValidationArguments): string {
    return `at least one of ${(args.constraints as string[]).join(', ')} must be provided`;
  }
}

/**
 * Rejects a PATCH body that would change nothing. Declare it on one property of
 * the DTO and list every field that counts as a change.
 */
export function AtLeastOneOf(fields: string[], options?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'atLeastOneDefined',
      target: object.constructor,
      propertyName,
      constraints: fields,
      options,
      validator: AtLeastOneDefinedConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isCrop', async: false })
class AllOrNoneConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const object = args.object as Record<string, unknown>;
    const defined = (args.constraints as string[]).filter(
      (field) => object[field] !== undefined,
    ).length;
    return defined === 0 || defined === (args.constraints as string[]).length;
  }

  defaultMessage(args: ValidationArguments): string {
    return `${(args.constraints as string[]).join(', ')} must be provided together or not at all`;
  }
}

/**
 * Rejects a body carrying only part of a group that is meaningless in pieces.
 *
 * The crop rectangle is the case it exists for: three of four coordinates
 * describe nothing, and silently ignoring the partial set would store a
 * centre-crop while the owner believed they had chosen a framing. Declared on
 * one property, like `AtLeastOneOf`, so the failure lands on a single field the
 * form can point at.
 */
export function AllOrNoneOf(fields: string[], options?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'isCrop',
      target: object.constructor,
      propertyName,
      constraints: fields,
      options,
      validator: AllOrNoneConstraint,
    });
  };
}

/** Characters an owner may reasonably type: digits, spacing and grouping. */
const PHONE_SHAPE = /^\+?[0-9 ()-]{5,24}$/;

/** E.164 allows at most 15 digits; below six nothing dialable exists. */
const MIN_DIGITS = 6;
const MAX_DIGITS = 15;

/**
 * Accepts a phone number as a person writes it.
 *
 * Deliberately loose: the number is printed on a menu, not dialled by us, so
 * the owner's own formatting — spaces, dashes, a `+420` prefix — is the value
 * worth keeping. The digit count is what separates a real number from junk.
 */
export function isPhoneNumber(value: unknown): value is string {
  if (typeof value !== 'string') return false;

  const trimmed = value.trim();
  if (!PHONE_SHAPE.test(trimmed)) return false;

  const digits = trimmed.replace(/\D/g, '').length;
  return digits >= MIN_DIGITS && digits <= MAX_DIGITS;
}

@ValidatorConstraint({ name: 'isPhone', async: false })
class IsPhoneConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return isPhoneNumber(value);
  }

  defaultMessage(): string {
    return `must be a phone number of ${MIN_DIGITS}–${MAX_DIGITS} digits`;
  }
}

/** Reported to the frontend as the field code `IS_PHONE`. */
export function IsPhone(options?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'isPhone',
      target: object.constructor,
      propertyName,
      options,
      validator: IsPhoneConstraint,
    });
  };
}

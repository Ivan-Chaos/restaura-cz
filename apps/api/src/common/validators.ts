import {
  registerDecorator,
  ValidatorConstraint,
  type ValidationArguments,
  type ValidationOptions,
  type ValidatorConstraintInterface,
} from 'class-validator';

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

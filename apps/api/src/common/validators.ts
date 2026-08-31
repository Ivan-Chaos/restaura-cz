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

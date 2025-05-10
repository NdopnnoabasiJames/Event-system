import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsPhoneNumber(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isPhoneNumber',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') return false;
          // Simple phone number validation (can be made more complex)
          return /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/.test(
            value,
          );
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid phone number`;
        },
      },
    });
  };
}

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') return false;
          // Password must contain at least 8 characters, 1 uppercase, 1 lowercase, 1 number and 1 special character
          return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(
            value,
          );
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must contain at least 8 characters, including uppercase, lowercase, number and special character`;
        },
      },
    });
  };
}

export function IsNotFutureDate(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isNotFutureDate',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (!(value instanceof Date)) {
            value = new Date(value);
          }
          return value <= new Date();
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} cannot be a future date`;
        },
      },
    });
  };
}

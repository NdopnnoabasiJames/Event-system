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

export function MaxSelection(maxItems: number, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'maxSelection',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [maxItems],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!Array.isArray(value)) return false;
          const [maxItems] = args.constraints;
          return value.length <= maxItems;
        },
        defaultMessage(args: ValidationArguments) {
          const [maxItems] = args.constraints;
          return `${args.property} must not have more than ${maxItems} items`;
        },
      },
    });
  };
}

export function MinSelection(minItems: number, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'minSelection',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [minItems],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!Array.isArray(value)) return false;
          const [minItems] = args.constraints;
          return value.length >= minItems;
        },
        defaultMessage(args: ValidationArguments) {
          const [minItems] = args.constraints;
          return `${args.property} must have at least ${minItems} items`;
        },
      },
    });
  };
}

export function SelectionRange(minItems: number, maxItems: number, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'selectionRange',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [minItems, maxItems],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!Array.isArray(value)) return false;
          const [minItems, maxItems] = args.constraints;
          return value.length >= minItems && value.length <= maxItems;
        },
        defaultMessage(args: ValidationArguments) {
          const [minItems, maxItems] = args.constraints;
          return `${args.property} must have between ${minItems} and ${maxItems} items`;
        },
      },
    });
  };
}

export function UniqueSelection(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'uniqueSelection',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (!Array.isArray(value)) return false;
          const uniqueItems = [...new Set(value)];
          return uniqueItems.length === value.length;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must contain unique items only`;
        },
      },
    });
  };
}

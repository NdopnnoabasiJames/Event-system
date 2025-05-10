import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import { addDays } from '../utils/date.util';

export function IsFutureDate(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isFutureDate',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (!(value instanceof Date)) {
            value = new Date(value);
          }
          const now = new Date();
          return value > now;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a future date`;
        },
      },
    });
  };
}

export function IsValidDateRange(relatedPropertyName: string, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidDateRange',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [relatedPropertyName],
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as any)[relatedPropertyName];

          if (!(value instanceof Date)) value = new Date(value);
          if (!(relatedValue instanceof Date)) relatedValue = new Date(relatedValue);

          return value > relatedValue;
        },
        defaultMessage(args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          return `${args.property} must be later than ${relatedPropertyName}`;
        },
      },
    });
  };
}

export function MaxDateRange(maxDays: number, relatedPropertyName: string, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'maxDateRange',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [maxDays, relatedPropertyName],
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [maxDays, relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as any)[relatedPropertyName];

          if (!(value instanceof Date)) value = new Date(value);
          if (!(relatedValue instanceof Date)) relatedValue = new Date(relatedValue);

          const maxDate = addDays(relatedValue, maxDays);
          return value <= maxDate;
        },
        defaultMessage(args: ValidationArguments) {
          const [maxDays, relatedPropertyName] = args.constraints;
          return `${args.property} cannot be more than ${maxDays} days after ${relatedPropertyName}`;
        },
      },
    });
  };
}

export function IsValidCapacity(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidCapacity',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          return typeof value === 'number' && value > 0 && Number.isInteger(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a positive integer`;
        },
      },
    });
  };
}

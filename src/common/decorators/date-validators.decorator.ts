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
          const date = value instanceof Date ? value : new Date(value);
          const now = new Date();
          return date > now;
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
          const relatedPropertyValue = (args.object as any)[relatedPropertyName];

          const date = value instanceof Date ? value : new Date(value);
          const relatedDate = relatedPropertyValue instanceof Date ? 
            relatedPropertyValue : new Date(relatedPropertyValue);

          return date > relatedDate;
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
          const relatedPropertyValue = (args.object as any)[relatedPropertyName];

          const date = value instanceof Date ? value : new Date(value);
          const relatedDate = relatedPropertyValue instanceof Date ? 
            relatedPropertyValue : new Date(relatedPropertyValue);

          const maxDate = addDays(relatedDate, maxDays);
          return date <= maxDate;
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

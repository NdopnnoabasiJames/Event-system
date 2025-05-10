import { HttpException, HttpStatus } from '@nestjs/common';

export class EntityNotFoundException extends HttpException {
  constructor(entity: string) {
    super(`${entity} not found`, HttpStatus.NOT_FOUND);
  }
}

export class InvalidCredentialsException extends HttpException {
  constructor() {
    super('Invalid credentials', HttpStatus.UNAUTHORIZED);
  }
}

export class DuplicateEntityException extends HttpException {
  constructor(entity: string) {
    super(`${entity} already exists`, HttpStatus.CONFLICT);
  }
}

export class ValidationFailedException extends HttpException {
  constructor(errors: string[]) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Validation failed',
        errors,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

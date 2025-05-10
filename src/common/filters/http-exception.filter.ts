import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { MongoError } from 'mongodb';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: message,
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'object') {
        errorResponse = {
          ...errorResponse,
          ...exceptionResponse as object,
          statusCode: status,
        };
      } else {
        errorResponse.message = exceptionResponse;
      }
    } else if (exception instanceof MongoError) {
      if (exception.code === 11000) {
        status = HttpStatus.CONFLICT;
        errorResponse.statusCode = status;
        errorResponse.message = 'Duplicate entry';
      }
    }

    this.logger.error(
      `Http Status: ${status} Error Message: ${JSON.stringify(errorResponse)}`,
    );

    response.status(status).json(errorResponse);
  }
}

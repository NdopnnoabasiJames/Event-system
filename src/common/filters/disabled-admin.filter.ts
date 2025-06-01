import { ExceptionFilter, Catch, ArgumentsHost, UnauthorizedException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch(UnauthorizedException)
export class DisabledAdminExceptionFilter implements ExceptionFilter {
  catch(exception: UnauthorizedException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const message = exception.message;

    // Handle disabled admin specific scenarios
    if (message.includes('disabled')) {
      return response.status(HttpStatus.FORBIDDEN).json({
        statusCode: HttpStatus.FORBIDDEN,
        error: 'Account Disabled',
        message: 'Your account has been disabled. Please contact your administrator for assistance.',
        timestamp: new Date().toISOString(),
        disabledAccount: true, // Flag to help frontend handle this scenario
      });
    }

    // Handle pending approval scenarios
    if (message.includes('pending approval')) {
      return response.status(HttpStatus.FORBIDDEN).json({
        statusCode: HttpStatus.FORBIDDEN,
        error: 'Account Pending Approval',
        message: 'Your account is pending approval from your supervisor.',
        timestamp: new Date().toISOString(),
        pendingApproval: true, // Flag to help frontend handle this scenario
      });
    }

    // Default unauthorized response
    return response.status(HttpStatus.UNAUTHORIZED).json({
      statusCode: HttpStatus.UNAUTHORIZED,
      error: 'Unauthorized',
      message: exception.message,
      timestamp: new Date().toISOString(),
    });
  }
}

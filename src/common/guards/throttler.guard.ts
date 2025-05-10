import { Injectable, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { Request } from 'express';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected errorMessage = 'Too Many Requests';

  protected async getTracker(req: Request): Promise<string> {
    return req.ip; // Use IP address as the tracker
  }

  protected throwThrottlingException(): void {
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: this.errorMessage,
        error: 'Rate limit exceeded',
        retryAfter: '60 seconds',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

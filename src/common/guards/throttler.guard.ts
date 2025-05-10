import { Injectable, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException, ThrottlerLimitDetail } from '@nestjs/throttler';
import { Request } from 'express';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected errorMessage = 'Too Many Requests';

  protected async getTracker(req: Request): Promise<string> {
    return req.ip;
  }

  protected async throwThrottlingException(context: ExecutionContext, throttlerLimitDetail: ThrottlerLimitDetail): Promise<void> {
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: this.errorMessage,
        error: 'Rate limit exceeded',
        retryAfter: throttlerLimitDetail.ttl,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

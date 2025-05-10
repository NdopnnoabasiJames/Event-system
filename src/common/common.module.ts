import { Global, Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { createWinstonLogger } from './utils/logger.util';
import { CustomThrottlerGuard } from './guards/throttler.guard';

@Global()
@Module({
  imports: [
    WinstonModule.forRootAsync({
      useFactory: (configService: ConfigService) => createWinstonLogger(configService),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        ttl: configService.get('THROTTLE_TTL', 60),
        limit: configService.get('THROTTLE_LIMIT', 10),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    {
      provide: 'ThrottlerGuard',
      useClass: CustomThrottlerGuard,
    },
  ],
  exports: [WinstonModule, ThrottlerModule],
})
export class CommonModule {}

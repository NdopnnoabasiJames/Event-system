import { Global, Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { createWinstonLogger } from './utils/logger.util';
import { CustomThrottlerGuard } from './guards/throttler.guard';
import { CloudinaryService } from './services/cloudinary.service';
import { ExcelExportService } from './services/excel-export.service';

@Global()
@Module({
  imports: [
    ConfigModule,
    WinstonModule.forRootAsync({
      useFactory: (configService: ConfigService) => createWinstonLogger(configService),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'short',
            ttl: config.get('THROTTLE_TTL', 60),
            limit: config.get('THROTTLE_LIMIT', 10),
          },
          {
            name: 'long',
            ttl: config.get('THROTTLE_LONG_TTL', 3600),
            limit: config.get('THROTTLE_LONG_LIMIT', 100),
          },
        ],
      }),
    }),
  ],  providers: [
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
    CloudinaryService,
    ExcelExportService,
  ],
  exports: [WinstonModule, ThrottlerModule, CloudinaryService, ExcelExportService],
})
export class CommonModule {}

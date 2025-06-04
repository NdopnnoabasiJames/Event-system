import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { EventsModule } from './events/events.module';
import { WorkersModule } from './workers/workers.module';
import { GuestsModule } from './guests/guests.module';
import { UploadModule } from './upload/upload.module';
import { TestModule } from './test/test.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SeedModule } from './seed/seed.module';
import { StatesModule } from './states/states.module';
import { BranchesModule } from './branches/branches.module';
import { ZonesModule } from './zones/zones.module';
import { PickupStationsModule } from './pickup-stations/pickup-stations.module';
import { AdminHierarchyModule } from './admin-hierarchy/admin-hierarchy.module';
import { databaseConfig, jwtConfig, emailConfig } from './config/configuration';
import { configValidationSchema } from './config/validation.schema';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { CommonModule } from './common/common.module';
import { RegistrarsModule } from './registrars/registrars.module';
import { ActiveAdminMiddleware } from './common/middleware/active-admin.middleware';
import { HealthController } from './health/health.controller';

@Module({
  imports: [ 
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig, emailConfig],
      validationSchema: configValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
        dbName: configService.get<string>('MONGODB_DB_NAME'),
                retryWrites: true,
        connectionFactory: (connection) => {
          connection.on('error', (error) => {
            console.error('MongoDB connection error:', error);
          });
          connection.on('disconnected', () => {
            console.log('MongoDB disconnected');
          });
          connection.on('connected', () => {
            console.log('MongoDB connected');
          });
          return connection;
        },

      }),
      inject: [ConfigService],    }),    CommonModule,
    AuthModule,
    UsersModule,    
    EventsModule,
    AdminHierarchyModule,
    StatesModule,
    BranchesModule,
    ZonesModule,
    PickupStationsModule,
    WorkersModule,
    GuestsModule,
    NotificationsModule,
    SeedModule,
    UploadModule,
    TestModule,
    RegistrarsModule,  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ActiveAdminMiddleware)
      .exclude('/auth/login', '/auth/register', '/auth/forgot-password')
      .forRoutes('*');
  }
}

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);  // Enable CORS with credentials
  app.enableCors({
    origin: ['http://localhost:5500', 'http://127.0.0.1:5500'],  // Allow both localhost and IP
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation setup
  const config = new DocumentBuilder()
    .setTitle('Event Management System')
    .setDescription('API documentation for the Event Management System')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('events', 'Event management endpoints')
    .addTag('marketers', 'Marketer-related endpoints')
    .addTag('attendees', 'Attendee management endpoints')
    .addTag('users', 'User management endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = configService.get('PORT');
  await app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log(
      `Swagger documentation is available at: http://localhost:${port}/api`,
    );
  });
}
bootstrap();

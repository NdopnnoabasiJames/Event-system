import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  
  // Increase payload size limits for file uploads
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
    
  // Set up static file serving
  app.useStaticAssets(join(__dirname, '..', 'public'));
  logger.log(`Static files will be served from: ${join(__dirname, '..', 'public')}`);
  
  // Ensure Images directory exists
  const imagesDir = join(__dirname, '..', 'public', 'Images', 'events');
  const fs = require('fs');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
    logger.log(`Created directory: ${imagesDir}`);
  }
  
  // Enable CORS with credentials
  app.enableCors({
    origin: ['http://localhost:5500', 'http://127.0.0.1:5500'],  // Allow both localhost and IP
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  });
  
  // Set up global prefix for API endpoints
  app.setGlobalPrefix('api');

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

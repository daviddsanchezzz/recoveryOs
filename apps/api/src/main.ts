import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as classTransformer from 'class-transformer';
import * as classValidator from 'class-validator';
import { config } from 'dotenv';
import { AppModule } from './app.module';

config({ quiet: true });

async function bootstrap() {
  const port = Number(process.env.PORT ?? 3001);
  const app = await NestFactory.create(AppModule, new ExpressAdapter());
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      validatorPackage: classValidator,
      transformerPackage: classTransformer,
    }),
  );
  await app.listen(port, '0.0.0.0');
}

void bootstrap();

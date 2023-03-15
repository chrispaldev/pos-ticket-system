import helmet from 'helmet';
import basicAuth from 'express-basic-auth';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { swaggerConfig } from './config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);
  const PORT = config.get<number>('PORT') || 3001;

  app.enableCors();
  app.use(helmet());
  app.useGlobalPipes(new ValidationPipe({ stopAtFirstError: true, transform: true, whitelist: true }));
  app.setGlobalPrefix('api/v1');

  if (['staging', 'production'].includes(config.get<string>('NODE_ENV'))) {
    app.use(
      ['/docs', '/docs-json'],
      basicAuth({
        challenge: true,
        users: {
          [config.get<string>('SWAGGER_USER')]: config.get<string>('SWAGGER_PASSWORD'),
        },
      }),
    );
  }

  swaggerConfig(app);

  await app.listen(PORT);
  const logger = new Logger('main');
  logger.log(`Application listening on port ${PORT}`);
}
bootstrap();

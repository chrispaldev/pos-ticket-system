import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

export const swaggerConfig = (app) => {
  const config = new DocumentBuilder()
    .setTitle('POS Ticket System APIs')
    .setDescription('Backend APIs of POS Ticket System')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'POS Swagger API',
  });
}
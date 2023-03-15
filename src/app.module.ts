import { APP_INTERCEPTOR, APP_FILTER, APP_GUARD } from '@nestjs/core';
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TransformInterceptor } from './shared/interceptors';
import { HttpExceptionFilter } from './shared/exception-filter';
import { LoggerMiddleware } from './shared/middlewares';
import { getMongooseFactory } from './shared/factories';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { HealthModule } from './health';
import { AuthModule } from './auth';
import { AdminModule } from './admin';
import { UserModule } from './user';
import { LocationModule } from './location';
import { DealModule } from './deal';
import { EventModule } from './event';
import { CategoryModule } from './category';
import { KitchenModule } from './kitchen';
import { ProductModule } from './product';
import { OrderModule } from './order';
import { PaymentModule } from './payment';
import { RFIDCardModule } from './rfidcard';
import { TransactionModule } from './transaction';
import { StatModule } from './stat';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
    }),
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 1200,
    }),
    MongooseModule.forRootAsync({
      useFactory: getMongooseFactory(),
    }),
    HealthModule,
    AuthModule,
    AdminModule,
    UserModule,
    LocationModule,
    DealModule,
    EventModule,
    CategoryModule,
    KitchenModule,
    ProductModule,
    OrderModule,
    PaymentModule,
    RFIDCardModule,
    TransactionModule,
    StatModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}

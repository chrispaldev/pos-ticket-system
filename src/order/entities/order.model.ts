import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './order.schema';
import { getModelFactory } from '../../shared/utils';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: Order.name,
        useFactory: getModelFactory(OrderSchema)
      },
    ]),
  ],
  exports: [
    MongooseModule.forFeatureAsync([
      {
        name: Order.name,
        useFactory: getModelFactory(OrderSchema)
      },
    ]),
  ],
})
export class OrderModel {}

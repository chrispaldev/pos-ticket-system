import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FreezeOrder, FreezeOrderSchema } from './freezeorder.schema';
import { getModelFactory } from '../../shared/utils';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: FreezeOrder.name,
        useFactory: getModelFactory(FreezeOrderSchema)
      },
    ]),
  ],
  exports: [
    MongooseModule.forFeatureAsync([
      {
        name: FreezeOrder.name,
        useFactory: getModelFactory(FreezeOrderSchema)
      },
    ]),
  ],
})
export class FreezeOrderModel {}

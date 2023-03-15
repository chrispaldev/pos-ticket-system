import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Kitchen, KitchenSchema } from './kitchen.schema';
import { getModelFactory } from '../../shared/utils';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: Kitchen.name,
        useFactory: getModelFactory(KitchenSchema)
      },
    ]),
  ],
  exports: [
    MongooseModule.forFeatureAsync([
      {
        name: Kitchen.name,
        useFactory: getModelFactory(KitchenSchema)
      },
    ]),
  ],
})
export class KitchenModel {}

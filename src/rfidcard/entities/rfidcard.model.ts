import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RFIDCard, RFIDCardSchema } from './rfidcard.schema';
import { getModelFactory } from '../../shared/utils';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: RFIDCard.name,
        useFactory: getModelFactory(RFIDCardSchema)
      },
    ]),
  ],
  exports: [
    MongooseModule.forFeatureAsync([
      {
        name: RFIDCard.name,
        useFactory: getModelFactory(RFIDCardSchema)
      },
    ]),
  ],
})
export class RFIDCardModel {}

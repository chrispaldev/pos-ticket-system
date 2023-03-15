import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Location, LocationSchema } from './location.schema';
import { getModelFactory } from '../../shared/utils';


@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: Location.name,
        useFactory: getModelFactory(LocationSchema),
      },
    ]),
  ],
  exports: [
    MongooseModule.forFeatureAsync([
      {
        name: Location.name,
        useFactory: getModelFactory(LocationSchema),
      },
    ]),
  ],
})
export class LocationModel {}

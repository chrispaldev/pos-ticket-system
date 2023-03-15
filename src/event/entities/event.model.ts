import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Event, EventSchema } from './event.schema';
import { getModelFactory } from '../../shared/utils';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: Event.name,
        useFactory: getModelFactory(EventSchema)
      },
    ]),
  ],
  exports: [
    MongooseModule.forFeatureAsync([
      {
        name: Event.name,
        useFactory: getModelFactory(EventSchema)
      },
    ]),
  ],
})
export class EventModel {}

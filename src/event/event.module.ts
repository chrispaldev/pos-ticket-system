import { Module } from '@nestjs/common';
import { EventService } from './event.service';
import { EventController } from './event.controller';
import { EventModel } from './entities';

@Module({
  imports: [EventModel],
  controllers: [EventController],
  providers: [EventService],
  exports: [EventService],
})
export class EventModule {}

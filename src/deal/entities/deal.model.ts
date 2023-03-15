import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Ticket, TicketSchema } from './deal.schema';
import { getModelFactory } from '../../shared/utils';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: Ticket.name,
        useFactory: getModelFactory(TicketSchema)
      },
    ]),
  ],
  exports: [
    MongooseModule.forFeatureAsync([
      {
        name: Ticket.name,
        useFactory: getModelFactory(TicketSchema)
      },
    ]),
  ],
})
export class TicketModel {}

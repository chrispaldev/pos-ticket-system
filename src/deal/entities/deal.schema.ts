import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ITicket, ITicketTrack } from '../../shared/interfaces';
import { getSchemaOptions, getSubSchemaOptions } from '../../shared/utils';
import { Document } from 'mongoose';

export type TicketDocument = Ticket & Document;

@Schema(getSubSchemaOptions())
class TicketTrack implements ITicketTrack {
  @Prop({ required: true, min: 1 })
  id: number;

  @Prop({ required: true, unique: true, trim: true })
  name: string;
  
  @Prop({ trim: true, maxlength: 250 })
  description?: string;

  @Prop({ required: true, trim: true })
  startTime: string;

  @Prop({ required: true, trim: true })
  endTime: string;

  @Prop({ required: true, min: 1, max: 60 })
  minsPerSlot: number;

  @Prop({ trim: true, default: 'EUR' })
  currency?: string;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ min: 0 })
  promotionPrice?: number;
}

const TicketTrackSchema = SchemaFactory.createForClass(TicketTrack);

@Schema(getSchemaOptions())
export class Ticket implements ITicket {
  @Prop({ required: true, unique: true, trim: true })
  name: string;
  
  @Prop({ trim: true, maxlength: 250 })
  description?: string;

  @Prop({ required: true, type: Date })
  validFrom: Date;

  @Prop({ required: true, type: Date })
  validTill: Date;

  @Prop({ required: true, type: [TicketTrackSchema] })
  tracks: TicketTrack[];
}

export const TicketSchema = SchemaFactory.createForClass(Ticket);
TicketSchema.index({ createdAt: 1 });

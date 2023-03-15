import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IEvent, ILocation } from '../../shared/interfaces';
import { getSchemaOptions } from '../../shared/utils';
import mongoose, { Document } from 'mongoose';

export type EventDocument = Event & Document;

@Schema(getSchemaOptions())
export class Event implements IEvent {
  @Prop({ required: true, unique: true, trim: true })
  name: string;
  
  @Prop({ trim: true, maxlength: 80 })
  description?: string;

  @Prop({ trim: true, default: 'EUR' })
  currency?: string;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ required: true, min: 0 })
  vat: number;

  @Prop({ required: true, min: 0 })
  credits: number;
  
  @Prop({ required: true, min: 0 })
  coupons: number;

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Location' }], index: true })
  locations: ILocation[];
}

export const EventSchema = SchemaFactory.createForClass(Event);
EventSchema.index({ createdAt: 1 });

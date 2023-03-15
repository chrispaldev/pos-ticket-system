import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ILocation, PaymentMethod } from '../../shared/interfaces';
import { getSchemaOptions } from '../../shared/utils';
import { Document } from 'mongoose';

export type LocationDocument = Location & Document;

@Schema(getSchemaOptions())
export class Location implements ILocation {
  @Prop({ required: true, unique: true, min: 1 })
  number: number;

  @Prop({ required: true, trim: true })
  name: string;
  
  @Prop({ trim: true, maxlength: 80 })
  description?: string;

  @Prop({ required: true, type: [String] })
  paymentMethods: PaymentMethod[];

  @Prop({ required: true, type: [String] })
  menus: string[];
}

export const LocationSchema = SchemaFactory.createForClass(Location);

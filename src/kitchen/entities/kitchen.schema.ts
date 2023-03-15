import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IKitchen } from '../../shared/interfaces';
import { getSchemaOptions } from '../../shared/utils';
import { Document } from 'mongoose';

export type KitchenDocument = Kitchen & Document;

@Schema(getSchemaOptions())
export class Kitchen implements IKitchen {
  @Prop({ required: true, unique: true, min: 1 })
  number: number;
  
  @Prop({ required: true, unique: true, trim: true })
  name: string;
  
  @Prop({ trim: true, maxlength: 80 })
  description: string;
}

export const KitchenSchema = SchemaFactory.createForClass(Kitchen);

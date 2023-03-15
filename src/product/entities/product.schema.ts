import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IProduct, ILocation, ICategory, IKitchen } from '../../shared/interfaces';
import { getSchemaOptions } from '../../shared/utils';
import mongoose, { Document } from 'mongoose';

export type ProductDocument = Product & Document;

@Schema(getSchemaOptions())
export class Product implements IProduct {
  @Prop({ required: true, unique: true, trim: true })
  name: string;
  
  @Prop({ trim: true, maxlength: 80 })
  description?: string;

  @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: 'Category', index: true })
  category: ICategory;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Category', index: true, default: null })
  subCategory?: ICategory;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Kitchen', index: true, default: null })
  kitchen?: IKitchen;

  @Prop({ trim: true })
  quantityPerUnit?: string;

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

export const ProductSchema = SchemaFactory.createForClass(Product);
ProductSchema.index({ createdAt: 1 });

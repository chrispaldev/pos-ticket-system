import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IFreezeOrder, IProductDetails, IProduct, IEventDetails, IEvent, OrderType, OrderSubType, ILocation } from '../../shared/interfaces';
import { getSchemaOptions, getSubSchemaOptions } from '../../shared/utils';
import mongoose, { Document } from 'mongoose';

export type FreezeOrderDocument = IFreezeOrder & Document;

@Schema(getSubSchemaOptions())
class EventDetails implements IEventDetails {
  @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: 'Event', index: true })
  event: IEvent;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ required: true, min: 0 })
  vat: number;

  @Prop({ required: true, min: 0 })
  credits: number;
  
  @Prop({ required: true, min: 0 })
  coupons: number;
}

@Schema(getSubSchemaOptions())
class ProductDetails implements IProductDetails {
  @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: 'Product', index: true })
  product: IProduct;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ required: true, min: 0 })
  vat: number;

  @Prop({ required: true, min: 0 })
  credits: number;
  
  @Prop({ required: true, min: 0 })
  coupons: number;
}

const EventDetailsSchema = SchemaFactory.createForClass(EventDetails);
const ProductDetailsSchema = SchemaFactory.createForClass(ProductDetails);

@Schema(getSchemaOptions())
export class FreezeOrder implements IFreezeOrder {
  @Prop({ required: true, default: () => new mongoose.Types.ObjectId })
  _id: mongoose.Schema.Types.ObjectId;

  @Prop({ trim: true, maxlength: 25 })
  customerName: string;

  @Prop({ required: true, trim: true })
  tableNo: string;
  
  @Prop({ trim: true, maxlength: 250 })
  description?: string;

  @Prop({ required: true, enum: OrderType })
  type: OrderType;

  @Prop({ required: true, enum: OrderSubType, default: OrderSubType.NonKitchen })
  subType: OrderSubType;

  @Prop({ type: [EventDetailsSchema] })
  eventDetails: EventDetails[];

  @Prop({ type: [ProductDetailsSchema] })
  productDetails: ProductDetails[];

  @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: 'Location', index: true })
  location: ILocation;

  @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true })
  user: string;
}

export const FreezeOrderSchema = SchemaFactory.createForClass(FreezeOrder);
FreezeOrderSchema.index({ createdAt: 1 });

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IOrder, IProductDetails, IProduct, IEventDetails, IEvent, OrderType, OrderSubType, PaymentMethod, ILocation, ITransaction, IRFIDCard } from '../../shared/interfaces';
import { getSchemaOptions, getNumericNanoId, getSubSchemaOptions } from '../../shared/utils';
import mongoose, { Document } from 'mongoose';

export type OrderDocument = Order & Document;

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
export class Order implements IOrder {
  @Prop({ required: true, default: () => new mongoose.Types.ObjectId })
  _id: mongoose.Schema.Types.ObjectId;

  @Prop({ required: true, unique: true, default: () => getNumericNanoId(12) })
  invoiceId: string;
  
  @Prop({ trim: true, maxlength: 250 })
  description?: string;

  @Prop({ required: true, enum: OrderType, index: true })
  type: OrderType;

  @Prop({ required: true, enum: OrderSubType, default: OrderSubType.NonKitchen })
  subType: OrderSubType;

  @Prop({ type: [EventDetailsSchema] })
  eventDetails: EventDetails[];

  @Prop({ type: [ProductDetailsSchema] })
  productDetails: ProductDetails[];

  @Prop({ required: true, enum: PaymentMethod, index: true })
  paymentMethod: PaymentMethod;

  @Prop({ required: true, type: Date, default: Date.now })
  orderedAt?: Date;

  @Prop({ type: String, ref: 'RFIDCard', default: null })
  card?: IRFIDCard;

  @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' })
  transaction: ITransaction

  @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: 'Location', index: true })
  location: ILocation;

  @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true })
  user: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
OrderSchema.index({ subType: 1, location: 1, createdAt: -1 });

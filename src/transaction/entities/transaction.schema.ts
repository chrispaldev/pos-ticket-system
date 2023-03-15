import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ITransaction, ILocation, TransactionType, TransactionStatus, IUser, TransactionCreatedBy, IOrder, ITicket, ITicketDetails, IRFIDCard, ICardDetails, ICreditDetails, 
  ICustomerDetails, AllPaymentMethod, } from '../../shared/interfaces';
import { getSchemaOptions, getSubSchemaOptions } from '../../shared/utils';
import mongoose, { Document } from 'mongoose';

export type TransactionDocument = Transaction & Document;

@Schema(getSubSchemaOptions())
class CardDetails implements ICardDetails {
  @Prop({ default: false })
  purchase?: boolean;

  @Prop({ default: false })
  topup?: boolean;

  @Prop({ min: 0, default: 0 })
  purchasePrice?: number;

  @Prop({ min: 0, default: 0 })
  topupPrice?: number;
}

@Schema(getSubSchemaOptions())
class CreditDetails implements ICreditDetails {
  @Prop({ required: true, min: 0 })
  credits: number;

  @Prop({ required: true, min: 0 })
  preCredits: number;

  @Prop({ required: true, min: 0 })
  postCredits: number;
}

@Schema(getSubSchemaOptions())
class CustomerDetails implements ICustomerDetails {
  @Prop({ trim: true, maxlength: 40 })
  name?: string;

  @Prop({ trim: true })
  email?: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ trim: true })
  city?: string;

  @Prop({ trim: true })
  iban?: string;

  @Prop({ trim: true })
  ipAddress?: string;
}

const CardDetailsSchema = SchemaFactory.createForClass(CardDetails);
const CreditDetailsSchema = SchemaFactory.createForClass(CreditDetails);
const CustomerDetailsSchema = SchemaFactory.createForClass(CustomerDetails);

@Schema(getSchemaOptions())
export class Transaction implements ITransaction {
  @Prop({ required: true, default: () => new mongoose.Types.ObjectId })
  _id: mongoose.Schema.Types.ObjectId;

  @Prop({ trim: true })
  externalId?: string;

  @Prop({ required: true, enum: TransactionType, index: true })
  type: TransactionType;
  
  @Prop({ trim: true, maxlength: 80 })
  description: string;

  @Prop({ required: true, enum: AllPaymentMethod })
  paymentMethod: AllPaymentMethod;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null })
  order?: IOrder;

  @Prop({ trim: true })
  code?: string;

  @Prop({ type: String, ref: 'Ticket', index: true, default: null })
  ticket?: ITicket;

  @Prop({ type: String, ref: 'RFIDCard', index: true, default: null })
  card?: IRFIDCard;

  @Prop({ type: CardDetailsSchema })
  cardDetails?: CardDetails;

  @Prop({ type: CreditDetailsSchema })
  creditDetails?: CreditDetails;

  @Prop({ type: mongoose.Schema.Types.Mixed })
  ticketDetails?: ITicketDetails;

  @Prop({ type: mongoose.Schema.Types.Mixed })
  dealDetails?: any;

  @Prop({ type: CustomerDetailsSchema })
  customerDetails?: ICustomerDetails;

  @Prop({ type: mongoose.Schema.Types.Mixed })
  externalDetails?: any;

  @Prop({ trim: true, default: 'EUR' })
  currency?: string;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ min: 0 })
  actualPrice?: number;

  @Prop({ min: 0, default: 0 })
  vat: number;

  @Prop({ min: 0, default: 0 })
  credits?: number;
  
  @Prop({ min: 0, default: 0 })
  coupons?: number;

  @Prop({ required: true, enum: TransactionStatus, index: true })
  status: TransactionStatus;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Location', index: true, default: null })
  location: ILocation;

  @Prop({ required: true, enum: TransactionCreatedBy, default: TransactionCreatedBy.User })
  createdBy?: TransactionCreatedBy;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, default: null })
  user: IUser;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
TransactionSchema.index({ createdAt: 1 });
TransactionSchema.index({ paymentMethod: 1, status: 1 });

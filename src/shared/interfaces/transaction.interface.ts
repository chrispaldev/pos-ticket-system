import { Schema } from "mongoose";
import { AllPaymentMethod } from "./basic.interface";
import { ITicket } from "./deal.interface";
import { ILocation } from "./location.interface";
import { IOrder } from "./order.interface";
import { IRFIDCard } from "./rfidcard.interface";
import { IUser } from "./user.interface";

export interface ITransaction {
  _id?: Schema.Types.ObjectId | string;
  externalId?: string;
  type: TransactionType;
  description?: string;
  paymentMethod: AllPaymentMethod;
  order?: null | string | IOrder;
  code?: string;
  ticket?: null | string | ITicket;
  card?: null | string | IRFIDCard;
  cardDetails?: ICardDetails;
  creditDetails?: ICreditDetails;
  ticketDetails?: ITicketDetails;
  dealDetails?: any;
  customerDetails?: ICustomerDetails;
  externalDetails?: any;
  currency?: string;
  price: number;
  actualPrice?: number;
  vat?: number;
  coupons?: number;
  credits?: number;
  status: TransactionStatus;
  location?: null | string | ILocation;
  createdBy?: TransactionCreatedBy;
  user?: null | string | IUser;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICardDetails {
  purchase?: boolean;
  topup?: boolean;
  purchasePrice?: number;
  topupPrice?: number;
}

export interface ICreditDetails {
  credits: number;
  preCredits: number;
  postCredits: number;
}

export interface ITicketDetails {
  slots: ITicketSlots[];
}

export interface ITicketSlots {
  trackId: number;
  date: string;
  startTime: string;
  endTime: string;
}

export interface ICustomerDetails {
  name?: string;
  email?: string;
  phone?: string;
  city?: string;
  iban?: string;
  ipAddress?: string;
}

export enum TransactionType {
  Order = 'order',
  Card = 'card',
  Ticket = 'ticket',
  Deal = 'deal',
  Refund = 'refund',
}

export enum TransactionStatus {
  Pending = 'pending',
  Completed = 'completed',
  Failed = 'failed',
}

export enum TransactionCreatedBy {
  User = 'user',
  Customer = 'customer'
}
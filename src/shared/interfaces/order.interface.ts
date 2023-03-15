import { Schema } from "mongoose";
import { PaymentMethod } from "./basic.interface";
import { IUser } from "./user.interface";
import { ILocation } from "./location.interface";
import { IEvent } from "./event.interface";
import { IProduct } from "./product.interface";
import { ITransaction } from "./transaction.interface";
import { IRFIDCard } from "./rfidcard.interface";

export interface IOrder {
  _id?: Schema.Types.ObjectId | string;
  invoiceId: string;
  description?: string;
  type: OrderType;
  subType: OrderSubType;
  eventDetails: IEventDetails[];
  productDetails: IProductDetails[];
  paymentMethod: PaymentMethod;
  orderedAt?: Date;
  card?: null | string | IRFIDCard;
  transaction: string | ITransaction;
  location: string | ILocation;
  user: string | IUser; 
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IFreezeOrder {
  _id?: Schema.Types.ObjectId | string;
  customerName: string;
  tableNo: string;
  description?: string;
  type: OrderType;
  subType: OrderSubType;
  eventDetails: IEventDetails[];
  productDetails: IProductDetails[];
  location: string | ILocation;
  user: string | IUser; 
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IEventDetails {
  event: string | IEvent;
  quantity: number;
  price: number;
  vat: number;
  credits: number;
  coupons: number;
}

export interface IProductDetails {
  product: string | IProduct;
  quantity: number;
  price: number;
  vat: number;
  credits: number;
  coupons: number;
}

export enum OrderType {
  Event = 'event',
  Product = 'product',
}

export enum OrderSubType {
  Kitchen = 'kitchen',
  NonKitchen = 'nonkitchen',
}
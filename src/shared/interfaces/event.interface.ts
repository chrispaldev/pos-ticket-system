import { ILocation } from "./location.interface";

export interface IEvent {
  _id?: string;
  name: string;
  description?: string;
  currency?: string;
  price: number;
  vat: number;
  credits: number;
  coupons: number;
  locations: string[] | ILocation[];
  createdAt?: Date;
  updatedAt?: Date;
}

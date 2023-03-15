import { PaymentMethod } from "./basic.interface";

export interface ILocation {
  _id?: string;
  number: number;
  name: string;
  description?: string;
  paymentMethods: PaymentMethod[];
  menus: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

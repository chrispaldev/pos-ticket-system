import { ICategory } from "./category.interface";
import { IKitchen } from "./kitchen.interface";
import { ILocation } from "./location.interface";

export interface IProduct {
  _id?: string;
  name: string;
  description?: string;
  category: string | ICategory;
  subCategory?: null | string | ICategory;
  kitchen?: null | string | IKitchen;
  quantityPerUnit?: string;
  currency?: string;
  price: number;
  vat: number;
  credits: number;
  coupons: number;
  locations: string[] | ILocation[];
  createdAt?: Date;
  updatedAt?: Date;
}

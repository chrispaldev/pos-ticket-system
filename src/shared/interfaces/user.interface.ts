import { AccountStatus } from "./basic.interface";
import { ILocation } from "./location.interface";

export interface IUser {
  _id?: string;
  name: string;
  username: string;
  email?: string;
  phone?: string;
  password: string;
  status: AccountStatus;
  location: string | ILocation
  terminal: string;
  createdAt?: Date;
  updatedAt?: Date;
}
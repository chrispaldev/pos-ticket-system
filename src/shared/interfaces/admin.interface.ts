import { AccountStatus } from "./basic.interface";

export interface IAdmin {
  _id?: string;
  name: string;
  username: string;
  email: string;
  password: string;
  role: string;
  status: AccountStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export enum AdminRole {
  SuperAdmin = 'superadmin',
  Admin = 'admin',
}
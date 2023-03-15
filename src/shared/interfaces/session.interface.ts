export interface ISession {
  _id?: string;
  user: string;
  refreshToken: string;
  family: string;
  expiredAt: Date;
  browserInfo?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export enum SessionStatus {
  Active = 'active',
  Expired = 'expired',
}
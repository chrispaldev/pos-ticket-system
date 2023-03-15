import { AccountStatus } from "./basic.interface";

export interface IRFIDCard {
  _id?: string;
  printedId: string;
  cvc: string;
  credits: number;
  purchaseStatus?: RFIDCardPurchaseStatus;
  status?: AccountStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export enum RFIDCardPurchaseStatus {
  Available = 'available',
  Purchased = 'purchased',
}

export enum RFIDCardOperation {
  Purchase = 'purchase',
  Topup = 'topup',
  Both = 'both',
}

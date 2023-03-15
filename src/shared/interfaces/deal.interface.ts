export interface ITicket {
  _id?: string;
  name: string;
  description?: string;
  validFrom: Date;
  validTill: Date;
  tracks: ITicketTrack[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITicketTrack {
  id: number;
  name: string;
  description?: string;
  startTime: string;
  endTime: string;
  minsPerSlot: number;
  currency?: string;
  price: number;
  promotionPrice?: number;
}

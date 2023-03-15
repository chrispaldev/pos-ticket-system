import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AccountStatus, IRFIDCard, RFIDCardPurchaseStatus } from '../../shared/interfaces';
import { getSchemaOptions } from '../../shared/utils';
import { Document } from 'mongoose';

export type RFIDCardDocument = RFIDCard & Document;

@Schema(getSchemaOptions())
export class RFIDCard implements IRFIDCard {
  @Prop({ required: true, trim: true })
  _id: string;

  @Prop({ required: true, unique: true, sparse: true, trim: true })
  printedId: string;

  @Prop({ required: true, trim: true })
  cvc: string;

  @Prop({ min: 0, default: 0 })
  credits: number;

  @Prop({ enum: RFIDCardPurchaseStatus, default: RFIDCardPurchaseStatus.Available })
  purchaseStatus?: RFIDCardPurchaseStatus;

  @Prop({ enum: AccountStatus, default: AccountStatus.Enabled })
  status?: AccountStatus;
}

export const RFIDCardSchema = SchemaFactory.createForClass(RFIDCard);
RFIDCardSchema.index({ createdAt: 1 });

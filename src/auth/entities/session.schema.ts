import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ISession } from '../../shared/interfaces';
import { getSchemaOptions } from '../../shared/utils';
import { Document } from 'mongoose';

export type SessionDocument = Session & Document;

@Schema(getSchemaOptions())
export class Session implements ISession {
  @Prop({ required: true })
  user: string;

  @Prop({ required: true })
  refreshToken: string;

  @Prop({ required: true, unique: true })
  family: string;

  @Prop({ required: true, type: Date })
  expiredAt: Date;

  @Prop({ trim: false })
  browserInfo?: string;
}

export const SessionSchema = SchemaFactory.createForClass(Session);

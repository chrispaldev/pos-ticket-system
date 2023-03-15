import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IUser, ILocation, AccountStatus } from '../../shared/interfaces';
import { getSchemaOptions } from '../../shared/utils';
import mongoose, { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema(getSchemaOptions())
export class User implements IUser {
  @Prop({ required: true, trim: true, minlength: 4, maxlength: 25 })
  name: string;

  @Prop({ required: true, unique: true, trim: true, lowercase: true, minlength: 4, maxlength: 25 })
  username: string;

  @Prop({ unique: true, sparse: true, trim: true, lowercase: true, maxlength: 40 })
  email?: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ required: true, enum: AccountStatus, default: AccountStatus.Enabled })
  status: AccountStatus;

  @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: 'Location', index: true })
  location: ILocation;

  @Prop({ trim: true })
  terminal: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ createdAt: 1 });

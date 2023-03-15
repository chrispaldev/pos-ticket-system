import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AccountStatus, AdminRole, IAdmin } from '../../shared/interfaces';
import { getSchemaOptions } from '../../shared/utils';
import { Document } from 'mongoose';

export type AdminDocument = Admin & Document;

@Schema(getSchemaOptions())
export class Admin implements IAdmin {
  @Prop({ required: true, trim: true, minlength: 4, maxlength: 25 })
  name: string;

  @Prop({ required: true, unique: true, trim: true, lowercase: true, minlength: 4, maxlength: 25 })
  username: string;

  @Prop({ required: true, unique: true, trim: true, lowercase: true, maxlength: 40 })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ required: true, enum: AdminRole, default: AdminRole.Admin })
  role: AdminRole;

  @Prop({ required: true, enum: AccountStatus, default: AccountStatus.Enabled })
  status: AccountStatus;
}

export const AdminSchema = SchemaFactory.createForClass(Admin);
AdminSchema.index({ createdAt: 1 });
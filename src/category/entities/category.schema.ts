import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ICategory } from '../../shared/interfaces';
import { getSchemaOptions } from '../../shared/utils';
import mongoose, { Document } from 'mongoose';

export type CategoryDocument = Category & Document;

@Schema(getSchemaOptions())
export class Category implements ICategory {
  @Prop({ required: true, unique: true, trim: true })
  name: string;
  
  @Prop({ trim: true, maxlength: 80 })
  description: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Category', index: true, default: null })
  parent?: ICategory;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
CategorySchema.index({ createdAt: 1 });

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Category, CategorySchema } from './category.schema';
import { getModelFactory } from '../../shared/utils';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: Category.name,
        useFactory: getModelFactory(CategorySchema)
      },
    ]),
  ],
  exports: [
    MongooseModule.forFeatureAsync([
      {
        name: Category.name,
        useFactory: getModelFactory(CategorySchema)
      },
    ]),
  ],
})
export class CategoryModel {}

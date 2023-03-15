import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from './product.schema';
import { getModelFactory } from '../../shared/utils';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: Product.name,
        useFactory: getModelFactory(ProductSchema)
      },
    ]),
  ],
  exports: [
    MongooseModule.forFeatureAsync([
      {
        name: Product.name,
        useFactory: getModelFactory(ProductSchema)
      },
    ]),
  ],
})
export class ProductModel {}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Admin, AdminSchema } from './admin.schema';
import { getModelFactory } from '../../shared/utils';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: Admin.name,
        useFactory: getModelFactory(AdminSchema)
      },
    ]),
  ],
  exports: [
    MongooseModule.forFeatureAsync([
      {
        name: Admin.name,
        useFactory: getModelFactory(AdminSchema)
      },
    ]),
  ],
})
export class AdminModel {}

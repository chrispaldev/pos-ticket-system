import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './user.schema';
import { getModelFactory } from '../../shared/utils';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: User.name,
        useFactory: getModelFactory(UserSchema),
      },
    ]),
  ],
  exports: [
    MongooseModule.forFeatureAsync([
      {
        name: User.name,
        useFactory: getModelFactory(UserSchema),
      },
    ]),
  ],
})
export class UserModel {}

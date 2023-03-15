import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Session, SessionSchema } from './session.schema';
import { getModelFactory } from '../../shared/utils';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: Session.name,
        useFactory: getModelFactory(SessionSchema)
      },
    ]),
  ],
  exports: [
    MongooseModule.forFeatureAsync([
      {
        name: Session.name,
        useFactory: getModelFactory(SessionSchema)
      },
    ]),
  ],
})
export class SessionModel {}

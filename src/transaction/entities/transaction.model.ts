import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Transaction, TransactionSchema } from './transaction.schema';
import { getModelFactory } from '../../shared/utils';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: Transaction.name,
        useFactory: getModelFactory(TransactionSchema)
      },
    ]),
  ],
  exports: [
    MongooseModule.forFeatureAsync([
      {
        name: Transaction.name,
        useFactory: getModelFactory(TransactionSchema)
      },
    ]),
  ],
})
export class TransactionModel {}

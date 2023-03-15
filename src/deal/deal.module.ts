import { Module } from '@nestjs/common';
import { DealService } from './deal.service';
import { DealController } from './deal.controller';
import { TicketModel } from './entities';
import { TransactionModule } from '../transaction';
import { PaymentModule } from '../payment';

@Module({
  imports: [TransactionModule, PaymentModule, TicketModel],
  controllers: [DealController],
  providers: [DealService],
  exports: [DealService],
})
export class DealModule {}

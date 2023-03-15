import { Module, forwardRef } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { OrderModel, FreezeOrderModel } from './entities';
import { UserModule } from '../user';
import { RFIDCardModule } from '../rfidcard';
import { TransactionModule } from '../transaction';
import { PaymentModule } from '../payment';

@Module({
  imports: [UserModule, RFIDCardModule, TransactionModule, forwardRef(() => PaymentModule), OrderModel, FreezeOrderModel],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}

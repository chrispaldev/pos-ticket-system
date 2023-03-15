import { Module, forwardRef } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { UserModule } from '../user';
import { RFIDCardModule } from '../rfidcard';
import { OrderModule } from '../order';
import { TransactionModule } from '../transaction';

@Module({
  imports: [UserModule, forwardRef(() => RFIDCardModule), forwardRef(() => OrderModule), TransactionModule],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}

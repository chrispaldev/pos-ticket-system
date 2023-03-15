import { Module, forwardRef } from '@nestjs/common';
import { RFIDCardService } from './rfidcard.service';
import { RFIDCardController } from './rfidcard.controller';
import { RFIDCardModel } from './entities';
import { PaymentModule } from '../payment';
import { TransactionModule } from '../transaction';

@Module({
  imports: [forwardRef(() => PaymentModule), TransactionModule, RFIDCardModel],
  controllers: [RFIDCardController],
  providers: [RFIDCardService],
  exports: [RFIDCardService],
})
export class RFIDCardModule {}

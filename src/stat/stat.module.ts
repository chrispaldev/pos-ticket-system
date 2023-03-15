import { Module } from '@nestjs/common';
import { StatService } from './stat.service';
import { StatController } from './stat.controller';
import { LocationModule } from '../location';
import { UserModule } from '../user';
import { CategoryModule } from '../category';
import { ProductModule } from '../product';
import { EventModule } from '../event';
import { RFIDCardModule } from '../rfidcard';
import { OrderModule } from '../order';
import { TransactionModule } from '../transaction';

@Module({
  imports: [
    LocationModule, 
    UserModule, 
    CategoryModule, 
    ProductModule, 
    EventModule, 
    RFIDCardModule, 
    OrderModule,
    TransactionModule
  ],
  controllers: [StatController],
  providers: [StatService],
  exports: [StatService],
})
export class StatModule {}

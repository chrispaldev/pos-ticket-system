import { Module } from '@nestjs/common';
import { KitchenService } from './kitchen.service';
import { KitchenController } from './kitchen.controller';
import { KitchenModel } from './entities';

@Module({
  imports: [KitchenModel],
  controllers: [KitchenController],
  providers: [KitchenService],
  exports: [KitchenService],
})
export class KitchenModule {}

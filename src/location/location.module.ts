import { Module } from '@nestjs/common';
import { LocationService } from './location.service';
import { UserModule } from '../user';
import { EventModule } from '../event';
import { ProductModule } from '../product';
import { LocationController } from './location.controller';
import { LocationModel } from './entities';

@Module({
  imports: [EventModule, ProductModule, LocationModel],
  controllers: [LocationController],
  providers: [LocationService],
  exports: [LocationService],
})
export class LocationModule {}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PickupStationsService } from './pickup-stations.service';
import { PickupStationsController } from './pickup-stations.controller';
import { PickupStation, PickupStationSchema } from '../schemas/pickup-station.schema';
import { Branch, BranchSchema } from '../schemas/branch.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PickupStation.name, schema: PickupStationSchema },
      { name: Branch.name, schema: BranchSchema },
    ])
  ],
  controllers: [PickupStationsController],
  providers: [PickupStationsService],
  exports: [PickupStationsService],
})
export class PickupStationsModule {}

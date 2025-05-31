import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PickupStationsService } from './pickup-stations.service';
import { PickupStationsController } from './pickup-stations.controller';
import { PickupStation, PickupStationSchema } from '../schemas/pickup-station.schema';
import { Branch, BranchSchema } from '../schemas/branch.schema';
import { Zone, ZoneSchema } from '../schemas/zone.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PickupStation.name, schema: PickupStationSchema },
      { name: Branch.name, schema: BranchSchema },
      { name: Zone.name, schema: ZoneSchema },
    ])
  ],
  controllers: [PickupStationsController],
  providers: [PickupStationsService],
  exports: [PickupStationsService],
})
export class PickupStationsModule {}

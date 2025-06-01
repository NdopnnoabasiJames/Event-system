import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PickupStationsService } from './pickup-stations.service';
import { PickupStationsController } from './pickup-stations.controller';
import { PickupStation, PickupStationSchema } from '../schemas/pickup-station.schema';
import { Branch, BranchSchema } from '../schemas/branch.schema';
import { Zone, ZoneSchema } from '../schemas/zone.schema';
import { User, UserSchema } from '../schemas/user.schema';
import { PickupStationManagementService } from './services/pickup-station-management.service';

@Module({  imports: [
    MongooseModule.forFeature([
      { name: PickupStation.name, schema: PickupStationSchema },
      { name: Branch.name, schema: BranchSchema },
      { name: Zone.name, schema: ZoneSchema },
      { name: User.name, schema: UserSchema },
    ])
  ],
  controllers: [PickupStationsController],
  providers: [PickupStationsService, PickupStationManagementService],
  exports: [PickupStationsService, PickupStationManagementService],
})
export class PickupStationsModule {}

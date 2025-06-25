import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ZonesService } from './zones.service';
import { ZonesController } from './zones.controller';
import { Zone, ZoneSchema } from '../schemas/zone.schema';
import { Branch, BranchSchema } from '../schemas/branch.schema';
import { User, UserSchema } from '../schemas/user.schema';
import { PickupStation, PickupStationSchema } from '../schemas/pickup-station.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Zone.name, schema: ZoneSchema },
      { name: Branch.name, schema: BranchSchema },
      { name: User.name, schema: UserSchema },
      { name: PickupStation.name, schema: PickupStationSchema },
    ])
  ],
  controllers: [ZonesController],
  providers: [ZonesService],
  exports: [ZonesService],
})
export class ZonesModule {}

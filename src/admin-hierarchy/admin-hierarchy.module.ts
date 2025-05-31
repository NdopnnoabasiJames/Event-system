import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminHierarchyService } from '../admin-hierarchy/admin-hierarchy.service';
import { AdminHierarchyController } from './admin-hierarchy.controller';
import { User, UserSchema } from '../schemas/user.schema';
import { State, StateSchema } from '../schemas/state.schema';
import { Branch, BranchSchema } from '../schemas/branch.schema';
import { Zone, ZoneSchema } from '../schemas/zone.schema';
import { Event, EventSchema } from '../schemas/event.schema';
import { PickupStation, PickupStationSchema } from '../schemas/pickup-station.schema';
import { HierarchicalEventCreationService } from '../events/hierarchical-event-creation.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: State.name, schema: StateSchema },
      { name: Branch.name, schema: BranchSchema },
      { name: Zone.name, schema: ZoneSchema },
      { name: Event.name, schema: EventSchema },
      { name: PickupStation.name, schema: PickupStationSchema },
    ]),
  ],
  controllers: [AdminHierarchyController],
  providers: [AdminHierarchyService, HierarchicalEventCreationService],
  exports: [AdminHierarchyService, HierarchicalEventCreationService],
})
export class AdminHierarchyModule {}

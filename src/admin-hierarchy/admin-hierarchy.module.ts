import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminHierarchyService } from '../admin-hierarchy/admin-hierarchy.service';
import { AdminHierarchyController } from './admin-hierarchy.controller';
import { User, UserSchema } from '../schemas/user.schema';
import { State, StateSchema } from '../schemas/state.schema';
import { Branch, BranchSchema } from '../schemas/branch.schema';
import { Zone, ZoneSchema } from '../schemas/zone.schema';
import { Event, EventSchema } from '../schemas/event.schema';
import { PickupStation, PickupStationSchema } from '../schemas/pickup-station.schema';
import { Guest, GuestSchema } from '../schemas/guest.schema';
import { HierarchicalEventCreationService } from '../events/hierarchical-event-creation.service';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: State.name, schema: StateSchema },
      { name: Branch.name, schema: BranchSchema },
      { name: Zone.name, schema: ZoneSchema },
      { name: Event.name, schema: EventSchema },
      { name: PickupStation.name, schema: PickupStationSchema },
      { name: Guest.name, schema: GuestSchema },
    ]),
    forwardRef(() => EventsModule),
  ],
  controllers: [AdminHierarchyController],
  providers: [AdminHierarchyService],
  exports: [AdminHierarchyService],
})
export class AdminHierarchyModule {}

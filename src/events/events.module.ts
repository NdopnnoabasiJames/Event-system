import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventsService } from './events.service';
import { HierarchicalEventService } from './hierarchical-event.service';
import { HierarchicalEventCreationService } from './hierarchical-event-creation.service';
import { EventsController } from './events.controller';
import { Event, EventSchema } from '../schemas/event.schema';
import { PickupStation, PickupStationSchema } from '../schemas/pickup-station.schema';
import { Branch, BranchSchema } from '../schemas/branch.schema';
import { Zone, ZoneSchema } from '../schemas/zone.schema';
import { UsersModule } from '../users/users.module';
import { AttendeesModule } from '../attendees/attendees.module';
import { StatesModule } from '../states/states.module';
import { BranchesModule } from '../branches/branches.module';
import { PickupStationsModule } from '../pickup-stations/pickup-stations.module';
import { AdminHierarchyModule } from '../admin-hierarchy/admin-hierarchy.module';

// Import the new smaller services
import { HierarchicalEventCreationService as HierarchicalEventCreationBaseService } from './services/hierarchical-event-creation.service';
import { HierarchicalEventSelectionService } from './services/hierarchical-event-selection.service';
import { HierarchicalEventAccessService } from './services/hierarchical-event-access.service';
import { HierarchicalEventAvailabilityService } from './services/hierarchical-event-availability.service';
import { HierarchicalPickupStationAssignmentService } from './services/hierarchical-pickup-station-assignment.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Event.name, schema: EventSchema },
      { name: PickupStation.name, schema: PickupStationSchema },
      { name: Branch.name, schema: BranchSchema },
      { name: Zone.name, schema: ZoneSchema },
    ]),
    UsersModule,
    AttendeesModule,
    StatesModule,
    BranchesModule,
    PickupStationsModule,
    forwardRef(() => AdminHierarchyModule),
  ],
  controllers: [EventsController],
  providers: [
    EventsService, 
    HierarchicalEventService, 
    HierarchicalEventCreationService,
    // New smaller services
    HierarchicalEventCreationBaseService,
    HierarchicalEventSelectionService,
    HierarchicalEventAccessService,
    HierarchicalEventAvailabilityService,
    HierarchicalPickupStationAssignmentService,
  ],
  exports: [
    EventsService, 
    HierarchicalEventService, 
    HierarchicalEventCreationService,
    HierarchicalEventCreationBaseService,
    HierarchicalEventSelectionService,
    HierarchicalEventAccessService,
    HierarchicalEventAvailabilityService,
    HierarchicalPickupStationAssignmentService,
  ],
})
export class EventsModule {}

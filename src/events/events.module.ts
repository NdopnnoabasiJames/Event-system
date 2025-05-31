import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventsService } from './events.service';
import { HierarchicalEventService } from './hierarchical-event.service';
import { HierarchicalEventCreationService } from './hierarchical-event-creation.service';
import { EventsController } from './events.controller';
import { Event, EventSchema } from '../schemas/event.schema';
import { UsersModule } from '../users/users.module';
import { AttendeesModule } from '../attendees/attendees.module';
import { StatesModule } from '../states/states.module';
import { BranchesModule } from '../branches/branches.module';
import { PickupStationsModule } from '../pickup-stations/pickup-stations.module';
import { AdminHierarchyModule } from '../admin-hierarchy/admin-hierarchy.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Event.name, schema: EventSchema }]),
    UsersModule,
    AttendeesModule,
    StatesModule,
    BranchesModule,
    PickupStationsModule,
    AdminHierarchyModule,
  ],
  controllers: [EventsController],
  providers: [EventsService, HierarchicalEventService, HierarchicalEventCreationService],
  exports: [EventsService, HierarchicalEventService, HierarchicalEventCreationService],
})
export class EventsModule {}

import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminHierarchyService } from './admin-hierarchy.service';
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

// Import the new modular services
import { AdminHierarchyCoreService } from './services/admin-hierarchy-core.service';
import { AdminManagementService } from './services/admin-management.service';
import { ZoneAdminApprovalService } from './services/zone-admin-approval.service';
import { PerformanceAnalyticsService } from './services/performance-analytics.service';
import { AdminDataAccessService } from './services/admin-data-access.service';
import { DashboardStatsService } from './services/dashboard-stats.service';

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
  ],  controllers: [AdminHierarchyController],
  providers: [
    AdminHierarchyService,
    AdminHierarchyCoreService,
    AdminManagementService,
    ZoneAdminApprovalService,
    PerformanceAnalyticsService,
    AdminDataAccessService,
    DashboardStatsService,
  ],
  exports: [AdminHierarchyService],
})
export class AdminHierarchyModule {}

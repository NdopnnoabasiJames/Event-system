import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GuestsService } from './guests.service';
import { GuestsController } from './guests.controller';
import { Guest, GuestSchema } from '../schemas/guest.schema';
import { Event, EventSchema } from '../schemas/event.schema';
import { PickupStation, PickupStationSchema } from '../schemas/pickup-station.schema';
import { User, UserSchema } from '../schemas/user.schema';
import { State, StateSchema } from '../schemas/state.schema';
import { Branch, BranchSchema } from '../schemas/branch.schema';
import { Zone, ZoneSchema } from '../schemas/zone.schema';

// Import core Phase 3 services (simplified)
import { AdminGuestController } from './controllers/admin-guest.controller';
import { AdminGuestManagementService } from './services/admin-guest-management.service';
import { GuestSearchService } from './services/guest-search.service';
import { GuestImportExportService } from './services/guest-import-export.service';
import { GuestValidationService } from './services/guest-validation.service';

// Import Phase 3.3 & 3.4 services and controllers
import { GuestAnalyticsService } from './services/guest-analytics.service';
import { GuestCommunicationService } from './services/guest-communication.service';
import { GuestAnalyticsController } from './controllers/guest-analytics.controller';
import { GuestCommunicationController } from './controllers/guest-communication.controller';

// Import AdminHierarchyModule for access control
import { AdminHierarchyModule } from '../admin-hierarchy/admin-hierarchy.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Guest.name, schema: GuestSchema },
      { name: Event.name, schema: EventSchema },
      { name: PickupStation.name, schema: PickupStationSchema },
      { name: User.name, schema: UserSchema },
      { name: State.name, schema: StateSchema },
      { name: Branch.name, schema: BranchSchema },
      { name: Zone.name, schema: ZoneSchema },
    ]),
    forwardRef(() => AdminHierarchyModule),
  ],  controllers: [
    GuestsController,
    AdminGuestController,
    GuestAnalyticsController,
    GuestCommunicationController,
  ],  providers: [
    GuestsService,
    AdminGuestManagementService,
    GuestSearchService,
    GuestImportExportService,
    GuestValidationService,
    GuestAnalyticsService,
    GuestCommunicationService,
  ],  exports: [
    GuestsService,
    AdminGuestManagementService,
    GuestSearchService,
    GuestAnalyticsService,
    GuestCommunicationService,
  ],
})
export class GuestsModule {}

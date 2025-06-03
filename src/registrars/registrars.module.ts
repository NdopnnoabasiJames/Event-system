import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RegistrarsController } from './registrars.controller';
import { CheckInController } from './controllers/check-in.controller';
import { RegistrarsService } from './registrars.service';
import { CheckInService } from './services/check-in.service';
import { CheckInDelegator } from './check-in.delegator';
import { EventsModule } from '../events/events.module';
import { UsersModule } from '../users/users.module';
import { AdminHierarchyModule } from '../admin-hierarchy/admin-hierarchy.module';
import { User, UserSchema } from '../schemas/user.schema';
import { Zone, ZoneSchema } from '../schemas/zone.schema';
import { Branch, BranchSchema } from '../schemas/branch.schema';
import { Guest, GuestSchema } from '../schemas/guest.schema';
import { Event, EventSchema } from '../schemas/event.schema';

@Module({  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Zone.name, schema: ZoneSchema },
      { name: Branch.name, schema: BranchSchema },
      { name: Guest.name, schema: GuestSchema },
      { name: Event.name, schema: EventSchema },
    ]),
    EventsModule,
    UsersModule,
    AdminHierarchyModule,
  ],  controllers: [RegistrarsController, CheckInController],
  providers: [RegistrarsService, CheckInService, CheckInDelegator],
  exports: [RegistrarsService],
})
export class RegistrarsModule {}

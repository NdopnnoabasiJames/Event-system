import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WorkersService } from './workers.service';
import { WorkersController } from './workers.controller';
import { WorkerStatsService } from './services/worker-stats.service';
import { WorkerGuestService } from './services/worker-guest.service';
import { WorkerVolunteerService } from './services/worker-volunteer.service';
import { VolunteerApprovalService } from './services/volunteer-approval.service';
import { EventsModule } from '../events/events.module';
import { UsersModule } from '../users/users.module';
import { GuestsModule } from '../guests/guests.module';
import { AuthModule } from '../auth/auth.module';
import { Worker, WorkerSchema } from '../schemas/worker.schema';
import { User, UserSchema } from '../schemas/user.schema';
import { Event, EventSchema } from '../schemas/event.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Worker.name, schema: WorkerSchema },
      { name: User.name, schema: UserSchema },
      { name: Event.name, schema: EventSchema }
    ]),
    EventsModule, 
    UsersModule, 
    GuestsModule,
    AuthModule
  ],
  controllers: [WorkersController],
  providers: [
    WorkersService, 
    WorkerStatsService, 
    WorkerGuestService,
    WorkerVolunteerService,
    VolunteerApprovalService
  ],
  exports: [
    WorkersService, 
    WorkerStatsService, 
    WorkerGuestService,
    WorkerVolunteerService,
    VolunteerApprovalService
  ],
})
export class WorkersModule {}

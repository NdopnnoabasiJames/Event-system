import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';
import { Event, EventSchema } from '../schemas/event.schema';
import { Attendee, AttendeeSchema } from '../schemas/attendee.schema';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: Event.name, schema: EventSchema },
      { name: Attendee.name, schema: AttendeeSchema },
    ]),
  ],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';
import { Event, EventSchema } from '../schemas/event.schema';
import { Guest, GuestSchema } from '../schemas/guest.schema';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),    MongooseModule.forFeature([
      { name: Event.name, schema: EventSchema },
      { name: Guest.name, schema: GuestSchema },
    ]),
  ],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}

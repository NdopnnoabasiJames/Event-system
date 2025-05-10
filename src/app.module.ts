import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { EventsModule } from './events/events.module';
import { MarketersModule } from './marketers/marketers.module';
import { AttendeesModule } from './attendees/attendees.module';
import { NotificationsService } from './notifications/notifications.service';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [AuthModule, UsersModule, EventsModule, MarketersModule, AttendeesModule, NotificationsModule],
  controllers: [],
  providers: [NotificationsService],
})
export class AppModule {}

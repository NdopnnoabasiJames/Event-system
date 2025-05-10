import { Module } from '@nestjs/common';
import { MarketersService } from './marketers.service';
import { MarketersController } from './marketers.controller';
import { EventsModule } from '../events/events.module';
import { UsersModule } from '../users/users.module';
import { AttendeesModule } from '../attendees/attendees.module';

@Module({
  imports: [EventsModule, UsersModule, AttendeesModule],
  controllers: [MarketersController],
  providers: [MarketersService],
  exports: [MarketersService],
})
export class MarketersModule {}

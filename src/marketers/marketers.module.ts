import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MarketersService } from './marketers.service';
import { MarketersController } from './marketers.controller';
import { EventsModule } from '../events/events.module';
import { UsersModule } from '../users/users.module';
import { AttendeesModule } from '../attendees/attendees.module';
import { Marketer, MarketerSchema } from '../schemas/marketer.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Marketer.name, schema: MarketerSchema }]),
    EventsModule, 
    UsersModule, 
    AttendeesModule
  ],
  controllers: [MarketersController],
  providers: [MarketersService],
  exports: [MarketersService],
})
export class MarketersModule {}

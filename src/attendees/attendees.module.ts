import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AttendeesService } from './attendees.service';
import { AttendeesController } from './attendees.controller';
import { Attendee, AttendeeSchema } from '../schemas/attendee.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Attendee.name, schema: AttendeeSchema }])
  ],
  controllers: [AttendeesController],
  providers: [AttendeesService],
  exports: [AttendeesService],
})
export class AttendeesModule {}

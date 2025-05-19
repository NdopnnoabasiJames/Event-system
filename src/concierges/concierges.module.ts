import { Module } from '@nestjs/common';
import { ConciergesController } from './concierges.controller';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [EventsModule],
  controllers: [ConciergesController],
})
export class ConciergesModule {}

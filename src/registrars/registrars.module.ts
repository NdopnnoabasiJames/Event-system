import { Module } from '@nestjs/common';
import { RegistrarsController } from './registrars.controller';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [EventsModule],
  controllers: [RegistrarsController],
})
export class RegistrarsModule {}

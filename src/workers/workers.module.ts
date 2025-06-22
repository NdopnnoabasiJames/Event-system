import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WorkersService } from './workers.service';
import { WorkersController } from './workers.controller';
import { WorkerStatsService } from './services/worker-stats.service';
import { WorkerGuestService } from './services/worker-guest.service';
import { EventsModule } from '../events/events.module';
import { UsersModule } from '../users/users.module';
import { GuestsModule } from '../guests/guests.module';
import { AuthModule } from '../auth/auth.module';
import { Worker, WorkerSchema } from '../schemas/worker.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Worker.name, schema: WorkerSchema }]),
    EventsModule, 
    UsersModule, 
    GuestsModule,
    AuthModule
  ],
  controllers: [WorkersController],
  providers: [WorkersService, WorkerStatsService, WorkerGuestService],
  exports: [WorkersService, WorkerStatsService, WorkerGuestService],
})
export class WorkersModule {}

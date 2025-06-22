import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { GuestsService } from '../../guests/guests.service';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class WorkerStatsService {
  constructor(
    private readonly usersService: UsersService,
    private readonly guestsService: GuestsService,
  ) {}

  // Get worker statistics
  async getWorkerStats(workerId: string) {
    const worker = await this.usersService.findById(workerId);
    if (!worker || worker.role !== Role.WORKER) {
      throw new NotFoundException('Worker not found');
    }

    // Get total events participated
    const totalEvents = worker.eventParticipation ? worker.eventParticipation.length : 0;

    // Get total registered guests by this worker
    const totalRegisteredGuests = await this.guestsService.countGuestsByWorker(workerId);

    // Get total checked-in guests registered by this worker
    const totalCheckedInGuests = await this.guestsService.countCheckedInGuestsByWorker(workerId);

    return {
      totalEvents,
      totalRegisteredGuests,
      totalCheckedInGuests
    };
  }
}

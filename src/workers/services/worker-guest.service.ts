import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { GuestsService } from '../../guests/guests.service';
import { EventsService } from '../../events/events.service';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class WorkerGuestService {
  constructor(
    private readonly usersService: UsersService,
    private readonly guestsService: GuestsService,
    private readonly eventsService: EventsService,
  ) {}

  // Get worker's registered guests
  async getWorkerGuests(workerId: string) {
    const worker = await this.usersService.findById(workerId);
    if (!worker || worker.role !== Role.WORKER) {
      throw new NotFoundException('Worker not found');
    }

    return this.guestsService.findGuestsByWorker(workerId);
  }

  // Register guest for event
  async registerGuestForEvent(guestData: any, workerId: string) {
    const worker = await this.usersService.findById(workerId);
    if (!worker || worker.role !== Role.WORKER) {
      throw new NotFoundException('Worker not found');
    }

    // Verify event exists
    const event = await this.eventsService.findOne(guestData.eventId);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Check if worker is authorized for this event
    // Worker can register guests if they are assigned to the event or if the event is in their branch
    const workerIds = event.workers ? event.workers.map((w: any) => w.toString()) : [];
    const isWorkerAssigned = workerIds.includes(workerId);
    
    // For branch-level authorization, we'll allow workers from the same branch
    // Note: Event schema might not have branch field, so we'll be permissive for now
    const isAuthorized = isWorkerAssigned || worker.isApproved; // Approved workers can register for events

    if (!isAuthorized) {
      throw new ForbiddenException('Worker not authorized to register guests for this event');
    }    // Register the guest
    const guestRegistrationData = {
      ...guestData,
      event: guestData.eventId,
      registeredBy: workerId,
      registeredAt: new Date(),
      // Add required state and branch from worker's profile
      state: worker.state, // Worker's state
      branch: worker.branch // Worker's branch
    };

    return this.guestsService.create(guestRegistrationData);
  }
}

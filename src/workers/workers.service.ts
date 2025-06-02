import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { EventsService } from '../events/events.service';
import { GuestsService } from '../guests/guests.service';
import { UsersService } from '../users/users.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Worker, WorkerDocument } from '../schemas/worker.schema';

@Injectable()
export class WorkersService {
  constructor(
    private readonly eventsService: EventsService,
    private readonly guestsService: GuestsService,
    private readonly usersService: UsersService,
    @InjectModel(Worker.name) private workerModel: Model<WorkerDocument>,
  ) {}
  async getAvailableEvents() {
    return this.eventsService.getActiveEvents();
  }

  async volunteerForEvent(eventId: string, workerId: string) {
    return this.eventsService.addWorkerToEvent(eventId, workerId);
  }

  async leaveEvent(eventId: string, workerId: string) {
    return this.eventsService.removeWorkerFromEvent(eventId, workerId);
  }

  async getWorkerEvents(workerId: string) {
    const user = await this.usersService.findById(workerId);
    
    // If the user has no events, return empty array
    if (!user.eventParticipation || user.eventParticipation.length === 0) {
      return [];
    }
    
    // Get all events the user has participated in using their eventParticipation array
    const eventIds = user.eventParticipation.map(id => id.toString());
    
    // Find all these events and return them
    const events = await this.eventsService.findAll();
    return events.filter(event => eventIds.includes(event._id.toString()));
  }

  async registerGuest(workerId: string, eventId: string, guestData: any) {
    // Verify worker is assigned to this event
    const event = await this.eventsService.findOne(eventId);
    const workerId_ObjId = new Types.ObjectId(workerId);
    
    // Extract just the ID from each worker object
    const workerIds = event.workers.map((w: any) => {
      // If w is already an ObjectId, use toString()
      if (w instanceof Types.ObjectId) {
        return w.toString();      }
      
      // If w is a full user object (as returned by populate), extract the _id
      if (w && typeof w === 'object' && '_id' in w) {
        return w._id.toString();
      }
      
      // If w is something else, convert to string (fallback)
      return String(w);
    });
    
    // Check if the worker exists in the event's workers array
    const isWorkerAuthorized = workerIds.includes(workerId);
    
    if (!isWorkerAuthorized) {
      throw new UnauthorizedException('You are not authorized to register guests for this event');
    }

    // If bus pickup is selected, validate the pickup station exists
    if (guestData.transportPreference === 'bus' && guestData.pickupStation) {
      // Verify the pickup station exists in the event
      const validStation = event.pickupStations.some(
        station => station.pickupStationId.toString() === guestData.pickupStation.toString()
      );
      if (!validStation) {
        throw new NotFoundException('Invalid pickup station for this event');
      }
    }

    // Create guest with worker reference
    return this.guestsService.create({
      ...guestData,
      event: eventId,
      registeredBy: workerId,
    });
  }

  async updateGuest(workerId: string, guestId: string, updateData: any) {
    const guest = await this.guestsService.findOne(guestId);

    // Verify worker registered this guest
    if (guest.registeredBy.toString() !== workerId) {
      throw new UnauthorizedException('You can only edit guests you registered');
    }    // If updating bus pickup, validate the new pickup station
    if (updateData.transportPreference === 'bus' && updateData.pickupStation) {
      const event = await this.eventsService.findOne(guest.event.toString());
      // Verify the pickup station exists in the event
      const validStation = event.pickupStations.some(
        station => station.pickupStationId.toString() === updateData.pickupStation.toString()
      );
      if (!validStation) {
        throw new NotFoundException('Invalid pickup station for this event');
      }
    }

    return this.guestsService.update(guestId, updateData);
  }
  async removeGuest(workerId: string, guestId: string) {
    const guest = await this.guestsService.findOne(guestId);

    // Verify worker registered this guest
    if (guest.registeredBy.toString() !== workerId) {
      throw new UnauthorizedException('You can only remove guests you registered');
    }

    return this.guestsService.remove(guestId);
  }

  async getWorkerGuests(workerId: string, eventId?: string) {
    const query = { registeredBy: workerId };
    if (eventId) {
      query['event'] = eventId;
    }
    return this.guestsService.findByQuery(query);
  }

  // Analytics methods for worker performance
  async getWorkerPerformanceStats(workerId: string) {
    // Get the worker
    const worker = await this.workerModel.findOne({ user: workerId }).exec();
    if (!worker) {
      // Create worker profile if it doesn't exist
      const user = await this.usersService.findById(workerId);
      if (!user) {
        throw new NotFoundException('Worker not found');
      }
      
      const newWorker = new this.workerModel({ 
        user: workerId,
        totalGuestsRegistered: 0,
        guestsPerEvent: new Map(),
        lastActivityDate: new Date()
      });
      await newWorker.save();
      return {
        totalGuestsRegistered: 0,
        guestsPerEvent: {},
        eventsParticipated: 0,
        averageGuestsPerEvent: 0
      };    }

    // Calculate stats from existing data
    const guests = await this.guestsService.findByQuery({ registeredBy: workerId });
    
    // Group guests by event
    const eventMap = new Map();
    guests.forEach(guest => {
      const eventId = guest.event.toString();
      if (!eventMap.has(eventId)) {
        eventMap.set(eventId, []);
      }
      eventMap.get(eventId).push(guest);
    });
    
    return {
      totalGuestsRegistered: guests.length,
      guestsPerEvent: Object.fromEntries([...eventMap].map(([k, v]) => [k, v.length])),
      eventsParticipated: eventMap.size,
      averageGuestsPerEvent: eventMap.size ? (guests.length / eventMap.size) : 0
    };
  }

  async getTopPerformingWorkers(limit: number = 10) {
    // Find all worker users
    const workers = await this.usersService.findByRole('worker');
    
    // Get performance data for each
    const workerStats = await Promise.all(
      workers.map(async (worker) => {
        const stats = await this.getWorkerPerformanceStats(worker._id.toString());
        return {
          worker: {
            id: worker._id,
            name: worker.name,
            email: worker.email
          },
          stats
        };
      })
    );
    
    // Sort by total guests registered
    return workerStats
      .sort((a, b) => b.stats.totalGuestsRegistered - a.stats.totalGuestsRegistered)
      .slice(0, limit);
  }  async getWorkerEventPerformance(workerId: string, eventId: string) {
    const guests = await this.guestsService.findByQuery({
      registeredBy: workerId,
      event: eventId
    });
    
    const event = await this.eventsService.findOne(eventId);
    
    return {
      event: {
        id: event._id,
        name: event.name,
        date: event.date
      },
      guestsCount: guests.length,
      guests: guests.map(guest => ({
        id: guest._id,
        name: guest.name,
        email: guest.email,
        phone: guest.phone,
        transportPreference: guest.transportPreference,
        checkedIn: guest.checkedIn || false,
        checkedInTime: guest.checkedInTime,
        checkedInBy: guest.checkedInBy
      }))
    };
  }
}

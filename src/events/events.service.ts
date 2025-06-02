import { HttpException, HttpStatus, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Event, EventDocument, EventPickupStation } from '../schemas/event.schema';
import { CreateEventDto } from './dto/create-event.dto';
import { Role } from '../common/enums/role.enum';
import { UsersService } from '../users/users.service';
import { User } from '../schemas/user.schema';
import { GuestsService } from '../guests/guests.service';

@Injectable()
export class EventsService {  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    private usersService: UsersService,
    private guestsService: GuestsService,
  ) {}

  async create(createEventDto: CreateEventDto): Promise<EventDocument> {
    try {
      console.log('Creating event with data:', JSON.stringify(createEventDto, null, 2));
      
      // Make sure states is an array
      if (!Array.isArray(createEventDto.states)) {
        console.log('Converting states to array');
        createEventDto.states = createEventDto.states ? [String(createEventDto.states)] : [];
      }
      
      // Validate branches is an array
      if (!Array.isArray(createEventDto.branches)) {
        console.log('Converting branches to array format');
        createEventDto.branches = [];
      }
      
      // Create new event with validated data
      const event = new this.eventModel(createEventDto);
      const savedEvent = await event.save();
      console.log('Event saved successfully:', savedEvent);
      return savedEvent;
    } catch (error) {
      console.error('Failed to create event:', error);
      throw new HttpException(`Failed to create event: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  async findAll(): Promise<EventDocument[]> {
    try {
      return await this.eventModel.find().populate('workers', '-password').exec();
    } catch (error) {
      throw new HttpException(`Failed to retrieve events: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  async findOne(id: string): Promise<EventDocument> {
    const event = await this.eventModel
      .findById(id)
      .populate('workers', '-password')
      .exec();
    
    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }
    return event;
  }

  async addBusPickup(eventId: string, location: string, departureTime: string): Promise<EventDocument> {
    try {
      const event = await this.findOne(eventId);
      if (!event) {
        throw new NotFoundException(`Event with ID ${eventId} not found`);
      }
        // Use pickupStations instead of busPickups
      event.pickupStations = event.pickupStations || [];
      event.pickupStations.push({
        pickupStationId: new Types.ObjectId(location),
        departureTime,
      });
      
      return await event.save();
    } catch (error) {
      throw new HttpException(`Failed to add bus pickup: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  async addWorkerToEvent(eventId: string, workerId: string): Promise<EventDocument> {
    const [event, worker] = await Promise.all([
      this.findOne(eventId),
      this.usersService.findById(workerId),
    ]);

    if (worker.role !== Role.WORKER) {
      throw new UnauthorizedException('Only workers can be added to events');
    }

    if (!event.workers) {
      event.workers = [];
    }

    const workerId_ObjId = new Types.ObjectId(workerId);
    const isWorkerAlreadyAdded = event.workers.some(w => w.toString() === workerId_ObjId.toString());
    
    if (!isWorkerAlreadyAdded) {
      event.workers.push(workerId_ObjId);
      
      await Promise.all([
        event.save(),
        this.usersService.addEventParticipation(workerId, eventId),
      ]);
    }

    return this.findOne(eventId);
  }
  async removeWorkerFromEvent(eventId: string, workerId: string): Promise<EventDocument> {
    try {
      const event = await this.findOne(eventId);
      if (!event) {
        throw new NotFoundException(`Event with ID ${eventId} not found`);
      }

      const workerId_ObjId = new Types.ObjectId(workerId);
      event.workers = event.workers.filter(
        w => w.toString() !== workerId_ObjId.toString()
      );

      await Promise.all([
        event.save(),
        this.usersService.removeEventParticipation(workerId, eventId),
      ]);

      return this.findOne(eventId);
    } catch (error) {
      throw new HttpException(`Failed to remove worker: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  async getEventsByState(state: string): Promise<EventDocument[]> {
    try {
      const events = await this.eventModel
        .find({ state })
        .populate('workers', '-password')
        .exec();

      if (!events || events.length === 0) {
        throw new NotFoundException(`No events found for state: ${state}`);
      }

      return events;
    } catch (error) {
      throw new HttpException(`Failed to get events by state: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  async getActiveEvents(): Promise<EventDocument[]> {
    try {
      const events = await this.eventModel
        .find({ isActive: true })
        .populate('workers', '-password')
        .exec();

      if (!events || events.length === 0) {
        throw new NotFoundException('No active events found');
      }

      return events;
    } catch (error) {
      throw new HttpException(`Failed to get active events: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    try {
      const event = await this.findOne(id);
      await this.eventModel.findByIdAndDelete(id);
      return { message: 'Event deleted successfully' };
    } catch (error) {
      throw new HttpException(`Failed to delete event: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  async requestRegistrar(eventId: string, userId: string): Promise<{ message: string }> {
    const event = await this.findOne(eventId);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.registrarRequests && event.registrarRequests.some(r => r.user.toString() === userId && r.status === 'Pending')) {
      throw new HttpException('You already have a pending registrar request for this event', HttpStatus.BAD_REQUEST);
    }

    event.registrarRequests = event.registrarRequests || [];
    event.registrarRequests.push({
      user: new Types.ObjectId(userId),
      status: 'Pending',
      requestedAt: new Date(),
    });

    await event.save();
    return { message: 'Registrar request submitted successfully' };
  }

  async findUpcoming(fromDate: Date): Promise<EventDocument[]> {
    try {
      return await this.eventModel.find({
        date: { $gte: fromDate.toISOString() },
        isActive: true,
      }).exec();
    } catch (error) {
      throw new HttpException(`Failed to get upcoming events: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  async getRegistrarAssignments(userId: string): Promise<any[]> {
    const events = await this.eventModel.find({
      'registrarRequests.user': new Types.ObjectId(userId)
    }).lean();

    return events.map(event => {
      const myRequest = (event.registrarRequests || []).find(r => r.user.toString() === userId);
      return {
        event,
        request: myRequest
      };
    });
  }
  async getAllPendingRegistrarRequests(): Promise<any[]> {
    const events = await this.eventModel.find({ 'registrarRequests.status': 'Pending' })
      .populate('registrarRequests.user', 'name email')
      .exec();

    const requests = [];
    for (const event of events) {
      for (const request of event.registrarRequests || []) {
        if (request.status === 'Pending') {
          requests.push({
            eventId: event._id,
            eventName: event.name,
            request
          });
        }
      }
    }
    return requests;
  }
  async reviewRegistrarRequest(eventId: string, requestId: string, approve: boolean, adminId: string): Promise<{ message: string }> {
    const event = await this.findOne(eventId);
    if (!event) throw new NotFoundException('Event not found');

    const req = event.registrarRequests.find(r => r._id.toString() === requestId);
    if (!req) throw new NotFoundException('Registrar request not found');

    if (req.status !== 'Pending') throw new HttpException('Request already reviewed', HttpStatus.BAD_REQUEST);

    req.status = approve ? 'Approved' : 'Rejected';
    req.reviewedAt = new Date();

    await event.save();
    return { message: `Request ${approve ? 'approved' : 'rejected'}` };
  }
  async getAllApprovedRegistrars(): Promise<any[]> {
    const events = await this.eventModel.find({ 'registrarRequests.status': 'Approved' })
      .populate('registrarRequests.user', 'name email')
      .exec();

    const approved = [];
    for (const event of events) {
      for (const request of event.registrarRequests || []) {
        if (request.status === 'Approved') {
          approved.push({
            eventId: event._id,
            eventName: event.name,
            request
          });
        }
      }
    }
    return approved;
  }
  async cancelRegistrarRequest(eventId: string, userId: string): Promise<{ message: string }> {
    const event = await this.findOne(eventId);
    if (!event) throw new NotFoundException('Event not found');

    const reqIndex = event.registrarRequests.findIndex(r => r.user.toString() === userId && r.status === 'Pending');
    if (reqIndex === -1) throw new NotFoundException('No pending request found');

    event.registrarRequests.splice(reqIndex, 1);
    await event.save();
    return { message: 'Registrar request cancelled successfully' };
  }
  async getEventsForWorkerBranch(branchId: string): Promise<EventDocument[]> {
    try {
      const events = await this.eventModel
        .find({ 
          branches: { $in: [branchId] },
          isActive: true 
        })
        .populate('workers', '-password')
        .exec();

      return events || [];
    } catch (error) {
      throw new HttpException(`Failed to get events for branch: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async checkInGuest(eventId: string, phone: string, registrarId: string): Promise<{ message: string }> {
    try {
      const event = await this.findOne(eventId);
      if (!event) {
        throw new NotFoundException('Event not found');
      }

      const registrarApproved = event.registrarRequests?.some(
        req => req.user.toString() === registrarId && req.status === 'Approved'
      );

      if (!registrarApproved) {
        throw new UnauthorizedException('You are not authorized to check in guests for this event');
      }

      const guests = await this.guestsService.findByQuery({
        phone: phone,
        event: new Types.ObjectId(eventId)
      });

      if (!guests || guests.length === 0) {
        throw new NotFoundException('Guest not found for this event');
      }

      const guest = guests[0];
      await this.guestsService.update(guest._id.toString(), {
        checkedIn: true,
        checkedInTime: new Date(),
        checkedInBy: registrarId,
      });

      return { message: 'Guest checked in successfully' };
    } catch (error) {
      throw new HttpException(`Failed to check in guest: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

import { HttpException, HttpStatus, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Event, EventDocument, EventPickupStation } from '../schemas/event.schema';
import { CreateEventDto } from './dto/create-event.dto';
import { Role } from '../common/enums/role.enum';
import { UsersService } from '../users/users.service';
import { User } from '../schemas/user.schema';
import { AttendeesService } from '../attendees/attendees.service';

@Injectable()
export class EventsService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    private usersService: UsersService,
    private attendeesService: AttendeesService,
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
      return await this.eventModel.find().populate('marketers', '-password').exec();
    } catch (error) {
      throw new HttpException(`Failed to retrieve events: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async findOne(id: string): Promise<EventDocument> {
    const event = await this.eventModel
      .findById(id)
      .populate('marketers', '-password')
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

  async addMarketerToEvent(eventId: string, marketerId: string): Promise<EventDocument> {
    const [event, marketer] = await Promise.all([
      this.findOne(eventId),
      this.usersService.findById(marketerId),
    ]);

    if (marketer.role !== Role.MARKETER) {
      throw new UnauthorizedException('Only marketers can be added to events');
    }

    if (!event.marketers) {
      event.marketers = [];
    }

    const marketerId_ObjId = new Types.ObjectId(marketerId);
    const isMarketerAlreadyAdded = event.marketers.some(m => m.toString() === marketerId_ObjId.toString());
    
    if (!isMarketerAlreadyAdded) {
      event.marketers.push(marketerId_ObjId);
      
      await Promise.all([
        event.save(),
        this.usersService.addEventParticipation(marketerId, eventId),
      ]);
    }

    return this.findOne(eventId);
  }

  async removeMarketerFromEvent(eventId: string, marketerId: string): Promise<EventDocument> {
    try {
      const event = await this.findOne(eventId);
      if (!event) {
        throw new NotFoundException(`Event with ID ${eventId} not found`);
      }

      const marketerId_ObjId = new Types.ObjectId(marketerId);
      event.marketers = event.marketers.filter(
        m => m.toString() !== marketerId_ObjId.toString()
      );

      await Promise.all([
        event.save(),
        this.usersService.removeEventParticipation(marketerId, eventId),
      ]);

      return this.findOne(eventId);
    } catch (error) {
      throw new HttpException(`Failed to remove marketer: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getEventsByState(state: string): Promise<EventDocument[]> {
    try {
      const events = await this.eventModel
        .find({ state })
        .populate('marketers', '-password')
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
        .populate('marketers', '-password')
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

  async requestConcierge(eventId: string, userId: string): Promise<{ message: string }> {
    const event = await this.findOne(eventId);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.conciergeRequests && event.conciergeRequests.some(r => r.user.toString() === userId && r.status === 'Pending')) {
      throw new HttpException('You already have a pending concierge request for this event', HttpStatus.BAD_REQUEST);
    }

    event.conciergeRequests = event.conciergeRequests || [];
    event.conciergeRequests.push({
      user: new Types.ObjectId(userId),
      status: 'Pending',
      requestedAt: new Date(),
    });

    await event.save();
    return { message: 'Concierge request submitted successfully' };
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

  async getConciergeAssignments(userId: string): Promise<any[]> {
    const events = await this.eventModel.find({
      'conciergeRequests.user': new Types.ObjectId(userId)
    }).lean();

    return events.map(event => {
      const myRequest = (event.conciergeRequests || []).find(r => r.user.toString() === userId);
      return {
        event,
        request: myRequest
      };
    });
  }

  async getAllPendingConciergeRequests(): Promise<any[]> {
    const events = await this.eventModel.find({ 'conciergeRequests.status': 'Pending' })
      .populate('conciergeRequests.user', 'name email')
      .exec();

    const requests = [];
    for (const event of events) {
      for (const request of event.conciergeRequests || []) {
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

  async reviewConciergeRequest(eventId: string, requestId: string, approve: boolean, adminId: string): Promise<{ message: string }> {
    const event = await this.findOne(eventId);
    if (!event) throw new NotFoundException('Event not found');

    const req = event.conciergeRequests.find(r => r._id.toString() === requestId);
    if (!req) throw new NotFoundException('Concierge request not found');

    if (req.status !== 'Pending') throw new HttpException('Request already reviewed', HttpStatus.BAD_REQUEST);

    req.status = approve ? 'Approved' : 'Rejected';
    req.reviewedAt = new Date();

    await event.save();
    return { message: `Request ${approve ? 'approved' : 'rejected'}` };
  }

  async getAllApprovedConcierges(): Promise<any[]> {
    const events = await this.eventModel.find({ 'conciergeRequests.status': 'Approved' })
      .populate('conciergeRequests.user', 'name email')
      .exec();

    const approved = [];
    for (const event of events) {
      for (const request of event.conciergeRequests || []) {
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

  async cancelConciergeRequest(eventId: string, userId: string): Promise<{ message: string }> {
    const event = await this.findOne(eventId);
    if (!event) throw new NotFoundException('Event not found');

    const reqIndex = event.conciergeRequests.findIndex(r => r.user.toString() === userId && r.status === 'Pending');
    if (reqIndex === -1) throw new NotFoundException('No pending request found');

    event.conciergeRequests.splice(reqIndex, 1);
    await event.save();
    return { message: 'Concierge request cancelled successfully' };
  }

  async checkInAttendee(eventId: string, phone: string, conciergeId: string): Promise<{ message: string }> {
    try {
      const event = await this.findOne(eventId);
      if (!event) {
        throw new NotFoundException('Event not found');
      }

      const conciergeApproved = event.conciergeRequests?.some(
        req => req.user.toString() === conciergeId && req.status === 'Approved'
      );

      if (!conciergeApproved) {
        throw new UnauthorizedException('You are not authorized to check in attendees for this event');
      }

      const attendees = await this.attendeesService.findByQuery({
        phone: phone,
        event: new Types.ObjectId(eventId)
      });

      if (!attendees || attendees.length === 0) {
        throw new NotFoundException('Attendee not found for this event');
      }      const attendee = attendees[0];
      await this.attendeesService.update(attendee._id.toString(), {
        checkedIn: true,
        checkedInTime: new Date(),
        checkedInBy: conciergeId,
      });

      return { message: 'Attendee checked in successfully' };
    } catch (error) {
      throw new HttpException(`Failed to check in attendee: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

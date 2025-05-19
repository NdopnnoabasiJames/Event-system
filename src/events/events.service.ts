import { HttpException, HttpStatus, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Event, EventDocument } from '../schemas/event.schema';
import { CreateEventDto } from './dto/create-event.dto';
import { Role } from '../common/enums/role.enum';
import { UsersService } from '../users/users.service';
import { User } from '../schemas/user.schema';

@Injectable()
export class EventsService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    private usersService: UsersService,
  ) {}

  async create(createEventDto: CreateEventDto): Promise<EventDocument> {
  try {
    const event = new this.eventModel(createEventDto);
    return await event.save();
  } catch (error) {
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
      throw new NotFoundException('Event not found');
    }
    return event;
  }
 async addBusPickup(eventId: string, location: string, departureTime: string): Promise<EventDocument> {
  try {
    const event = await this.findOne(eventId);
    if (!event) {
      throw new HttpException('Event not found', HttpStatus.NOT_FOUND);
    }

    event.busPickups = event.busPickups || [];
    event.busPickups.push({ 
      location, 
      departureTime, // departureTime is already a string
      maxCapacity: 50,
      currentCount: 0,
      notes: ''
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
    
    try {
      await Promise.all([
        event.save(),
        this.usersService.addEventParticipation(marketerId, eventId),
      ]);
    } catch (error) {
      throw new HttpException(`Failed to add marketer to event: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  
  return this.findOne(eventId);
}

  async removeMarketerFromEvent(eventId: string, marketerId: string): Promise<EventDocument> {
  try {
    const event = await this.findOne(eventId);
    if (!event) {
      throw new HttpException('Event not found', HttpStatus.NOT_FOUND);
    }

    const marketerId_ObjId = new Types.ObjectId(marketerId);
    event.marketers = event.marketers.filter(
      (id) => id.toString() !== marketerId_ObjId.toString()
    );

    await Promise.all([
      event.save(),
      this.usersService.removeEventParticipation(marketerId, eventId),
    ]);

    return this.findOne(eventId);
  } catch (error) {
    throw new HttpException(`Failed to remove marketer from event: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

 async getEventsByState(state: string): Promise<EventDocument[]> {
  try {
    const events = await this.eventModel
      .find({ state })
      .populate('marketers', '-password')
      .exec();

    if (!events || events.length === 0) {
      throw new HttpException('No events found for the specified state', HttpStatus.NOT_FOUND);
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
      throw new HttpException('No active events found', HttpStatus.NOT_FOUND);
    }

    return events;
  } catch (error) {
    throw new HttpException(`Failed to retrieve active events: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

  async remove(id: string): Promise<{ message: string }> {
    try {
      const event = await this.findOne(id);
      await this.eventModel.findByIdAndDelete(id);
      return { message: 'Event deleted successfully' };
    } catch (error) {
      throw new HttpException(`Failed to delete event: ${error.message}`, 
        error instanceof NotFoundException ? HttpStatus.NOT_FOUND : HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async requestConcierge(eventId: string, userId: string): Promise<{ message: string }> {
    const event = await this.findOne(eventId);
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    // Prevent duplicate requests
    if (event.conciergeRequests && event.conciergeRequests.some(r => r.user.toString() === userId && r.status === 'Pending')) {
      throw new HttpException('You have already requested to be concierge for this event', HttpStatus.BAD_REQUEST);
    }
    // Add request (include all required fields for schema)
    event.conciergeRequests = event.conciergeRequests || [];
    event.conciergeRequests.push({
      user: new Types.ObjectId(userId),
      status: 'Pending',
      requestedAt: new Date(),
      reviewedAt: undefined,
      reviewedBy: undefined,
    });
    await event.save();
    return { message: 'Request submitted for admin approval' };
  }

  async findUpcoming(fromDate: Date): Promise<EventDocument[]> {
    try {
      return await this.eventModel.find({
        isActive: true,
        date: { $gte: fromDate.toISOString() },
      }).exec();
    } catch (error) {
      throw new HttpException(`Failed to retrieve upcoming events: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Get all events where the current user is an approved concierge
  async getConciergeAssignments(userId: string): Promise<EventDocument[]> {
    return this.eventModel.find({
      'conciergeRequests': {
        $elemMatch: {
          user: new Types.ObjectId(userId),
          status: 'Approved',
        },
      },
    }).exec();
  }

  // ADMIN: Get all pending concierge requests for all events
  async getAllPendingConciergeRequests(): Promise<any[]> {
    // Return a flat list of requests with event and user info for admin UI
    const events = await this.eventModel.find({ 'conciergeRequests.status': 'Pending' })
      .populate('conciergeRequests.user', 'name email phone')
      .exec();
    const requests = [];
    for (const event of events) {
      for (const req of event.conciergeRequests) {
        if (req.status === 'Pending') {
          requests.push({
            eventId: event._id,
            eventName: event.name,
            eventDate: event.date,
            requestId: req._id,
            user: req.user,
            requestedAt: req.requestedAt,
            status: req.status,
          });
        }
      }
    }
    return requests;
  }

  // ADMIN: Approve or reject a concierge request
 async reviewConciergeRequest(eventId: string, requestId: string, approve: boolean, adminId: string): Promise<{ message: string }> {
  const event = await this.findOne(eventId);
  if (!event) throw new NotFoundException('Event not found');
  
  // Use find() instead of id()
  const req = event.conciergeRequests.find(r => r._id.toString() === requestId);
  if (!req) throw new NotFoundException('Concierge request not found');
  
  if (req.status !== 'Pending') throw new HttpException('Request already reviewed', HttpStatus.BAD_REQUEST);
  req.status = approve ? 'Approved' : 'Rejected';
  req.reviewedAt = new Date();
  // Remove reviewedBy logic
  await event.save();
  return { message: `Request ${approve ? 'approved' : 'rejected'}` };
}

  // ADMIN: Get all approved concierge assignments for all events
  async getAllApprovedConcierges(): Promise<any[]> {
    const events = await this.eventModel.find({ 'conciergeRequests.status': 'Approved' })
      .populate('conciergeRequests.user', 'name email phone')
      .exec();
    const approved = [];
    for (const event of events) {
      for (const req of event.conciergeRequests) {
        if (req.status === 'Approved') {
          approved.push({
            eventId: event._id,
            eventName: event.name,
            eventDate: event.date,
            user: req.user,
            reviewedAt: req.reviewedAt,
            // Remove reviewedByName
          });
        }
      }
    }
    return approved;
  }
}

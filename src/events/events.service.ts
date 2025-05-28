import { HttpException, HttpStatus, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Event, EventDocument } from '../schemas/event.schema';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { Role } from '../common/enums/role.enum';
import { UsersService } from '../users/users.service';
import { User } from '../schemas/user.schema';
import { AttendeesService } from '../attendees/attendees.service';
import { StatesService } from '../states/states.service';
import { BranchesService } from '../branches/branches.service';
import { PickupStationsService } from '../pickup-stations/pickup-stations.service';

@Injectable()
export class EventsService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    private usersService: UsersService,
    private attendeesService: AttendeesService,
    private statesService: StatesService,
    private branchesService: BranchesService,
    private pickupStationsService: PickupStationsService,
  ) {}
  async create(createEventDto: CreateEventDto): Promise<EventDocument> {
    try {
      console.log('Creating event with data:', JSON.stringify(createEventDto, null, 2));
      
      // Validate states exist
      if (createEventDto.states && createEventDto.states.length > 0) {
        for (const stateId of createEventDto.states) {
          const state = await this.statesService.findOne(stateId);
          if (!state) {
            throw new HttpException(`State with ID ${stateId} not found`, HttpStatus.BAD_REQUEST);
          }
        }
      }
      
      // Validate branches exist and belong to the specified states
      if (createEventDto.branches && createEventDto.branches.length > 0) {
        for (const branchId of createEventDto.branches) {
          const branch = await this.branchesService.findOne(branchId);
          if (!branch) {
            throw new HttpException(`Branch with ID ${branchId} not found`, HttpStatus.BAD_REQUEST);
          }
          
          // Check if branch belongs to one of the specified states
          if (createEventDto.states && !createEventDto.states.includes(branch.stateId.toString())) {
            throw new HttpException(`Branch ${branchId} does not belong to any of the specified states`, HttpStatus.BAD_REQUEST);
          }
        }
      }
      
      // Validate pickup stations exist and belong to the specified branches
      if (createEventDto.pickupStations && createEventDto.pickupStations.length > 0) {
        for (const pickupStation of createEventDto.pickupStations) {
          const station = await this.pickupStationsService.findOne(pickupStation.pickupStationId);
          if (!station) {
            throw new HttpException(`Pickup station with ID ${pickupStation.pickupStationId} not found`, HttpStatus.BAD_REQUEST);
          }
          
          // Check if pickup station belongs to one of the specified branches
          if (createEventDto.branches && !createEventDto.branches.includes(station.branchId.toString())) {
            throw new HttpException(`Pickup station ${pickupStation.pickupStationId} does not belong to any of the specified branches`, HttpStatus.BAD_REQUEST);
          }
        }
      }
      
      // Convert string IDs to ObjectIds for pickup stations
      const eventData = {
        ...createEventDto,
        pickupStations: createEventDto.pickupStations?.map(ps => ({
          ...ps,
          pickupStationId: new Types.ObjectId(ps.pickupStationId)
        }))
      };
      
      // Create new event with validated data
      const event = new this.eventModel(eventData);
      const savedEvent = await event.save();
      console.log('Event saved successfully:', savedEvent);
      return savedEvent;
    } catch (error) {
      console.error('Failed to create event:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(`Failed to create event: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  async findAll(): Promise<EventDocument[]> {
    try {
      return await this.eventModel
        .find()
        .populate('marketers', '-password')
        .populate('states', 'name code')
        .populate('branches', 'name location')
        .populate('pickupStations.pickupStationId', 'location')
        .exec();
    } catch (error) {
      throw new HttpException(`Failed to retrieve events: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  async findOne(id: string): Promise<EventDocument> {
    const event = await this.eventModel
      .findById(id)
      .populate('marketers', '-password')
      .populate('states', 'name code')
      .populate('branches', 'name location')
      .populate('pickupStations.pickupStationId', 'location')
      .exec();
    
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    return event;
  }  async addPickupStation(eventId: string, pickupStationId: string, departureTime: string, maxCapacity: number = 50, notes?: string): Promise<EventDocument> {
    try {
      const event = await this.findOne(eventId);
      if (!event) {
        throw new HttpException('Event not found', HttpStatus.NOT_FOUND);
      }

      // Validate pickup station exists
      const pickupStation = await this.pickupStationsService.findOne(pickupStationId);
      if (!pickupStation) {
        throw new HttpException('Pickup station not found', HttpStatus.NOT_FOUND);
      }

      // Check if pickup station's branch is part of this event
      if (!event.branches.some(branchId => branchId.toString() === pickupStation.branchId.toString())) {
        throw new HttpException('Pickup station does not belong to any branch participating in this event', HttpStatus.BAD_REQUEST);
      }

      // Check if pickup station is already added to this event
      if (event.pickupStations?.some(ps => ps.pickupStationId.toString() === pickupStationId)) {
        throw new HttpException('Pickup station already added to this event', HttpStatus.BAD_REQUEST);
      }

      event.pickupStations = event.pickupStations || [];
      event.pickupStations.push({ 
        pickupStationId: new Types.ObjectId(pickupStationId),
        departureTime,
        maxCapacity,
        currentCount: 0,
        notes
      });

      return await event.save();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(`Failed to add pickup station: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async removePickupStation(eventId: string, pickupStationId: string): Promise<EventDocument> {
    try {
      const event = await this.findOne(eventId);
      if (!event) {
        throw new HttpException('Event not found', HttpStatus.NOT_FOUND);
      }

      if (!event.pickupStations) {
        throw new HttpException('No pickup stations found for this event', HttpStatus.NOT_FOUND);
      }

      const initialLength = event.pickupStations.length;
      event.pickupStations = event.pickupStations.filter(
        ps => ps.pickupStationId.toString() !== pickupStationId
      );

      if (event.pickupStations.length === initialLength) {
        throw new HttpException('Pickup station not found in this event', HttpStatus.NOT_FOUND);
      }

      return await event.save();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(`Failed to remove pickup station: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async updatePickupStation(eventId: string, pickupStationId: string, updateData: Partial<{ departureTime: string; maxCapacity: number; notes: string }>): Promise<EventDocument> {
    try {
      const event = await this.findOne(eventId);
      if (!event) {
        throw new HttpException('Event not found', HttpStatus.NOT_FOUND);
      }

      const pickupStation = event.pickupStations?.find(
        ps => ps.pickupStationId.toString() === pickupStationId
      );

      if (!pickupStation) {
        throw new HttpException('Pickup station not found in this event', HttpStatus.NOT_FOUND);
      }

      // Update the pickup station data
      Object.assign(pickupStation, updateData);

      return await event.save();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(`Failed to update pickup station: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
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
 async getEventsByState(stateId: string): Promise<EventDocument[]> {
  try {
    // Validate state exists
    const state = await this.statesService.findOne(stateId);
    if (!state) {
      throw new HttpException('State not found', HttpStatus.NOT_FOUND);
    }

    const events = await this.eventModel
      .find({ states: new Types.ObjectId(stateId) })
      .populate('marketers', '-password')
      .populate('states', 'name code')
      .populate('branches', 'name location')
      .populate('pickupStations.pickupStationId', 'location')
      .exec();

    if (!events || events.length === 0) {
      throw new HttpException('No events found for the specified state', HttpStatus.NOT_FOUND);
    }

    return events;
  } catch (error) {
    if (error instanceof HttpException) {
      throw error;
    }
    throw new HttpException(`Failed to get events by state: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}  async getActiveEvents(): Promise<EventDocument[]> {
    try {
      const events = await this.eventModel
        .find({ isActive: true })
        .populate('marketers', '-password')
        .populate('states', 'name code')
        .populate('branches', 'name location')
        .populate('pickupStations.pickupStationId', 'location')
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

  // Get all events where the current user has ANY concierge request (pending, approved, rejected)
  async getConciergeAssignments(userId: string): Promise<any[]> {
    const events = await this.eventModel.find({
      'conciergeRequests.user': new Types.ObjectId(userId)
    }).lean();
    // Attach the user's request status to each event
    return events.map(event => {
      const myRequest = (event.conciergeRequests || []).find(r => r.user.toString() === userId);
      return {
        ...event,
        myConciergeStatus: myRequest ? myRequest.status : undefined
      };
    });
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
  // Concierge cancels their own pending request for an event
  async cancelConciergeRequest(eventId: string, userId: string): Promise<{ message: string }> {
    const event = await this.findOne(eventId);
    if (!event) throw new NotFoundException('Event not found');
    const reqIndex = event.conciergeRequests.findIndex(r => r.user.toString() === userId && r.status === 'Pending');
    if (reqIndex === -1) throw new NotFoundException('No pending request found');
    event.conciergeRequests.splice(reqIndex, 1);
    await event.save();
    return { message: 'Request cancelled' };
  }

  // Check in an attendee to an event
  async checkInAttendee(eventId: string, phone: string, conciergeId: string): Promise<{ message: string }> {
    try {
      // Find the event
      const event = await this.findOne(eventId);
      if (!event) {
        throw new NotFoundException('Event not found');
      }

      // Verify concierge is approved for this event
      const conciergeApproved = event.conciergeRequests?.some(
        req => req.user.toString() === conciergeId && req.status === 'Approved'
      );
      
      if (!conciergeApproved) {
        throw new UnauthorizedException('You are not an approved concierge for this event');
      }

      // Find the attendee by phone and event
      const attendees = await this.attendeesService.findByQuery({ 
        phone: phone,
        event: new Types.ObjectId(eventId)
      });
      
      if (!attendees || attendees.length === 0) {
        throw new NotFoundException('Attendee not found for this event');
      }
      
      const attendee = attendees[0];
      
      // Check if already checked in
      if (attendee.checkedIn) {
        throw new HttpException('Attendee already checked in', HttpStatus.BAD_REQUEST);
      }
      
      // Update the attendee record with check-in information
      await this.attendeesService.update(attendee._id.toString(), {
        checkedIn: true,
        checkedInBy: conciergeId,
        checkedInTime: new Date()
      });
      
      return { message: 'Attendee checked in successfully' };
    } catch (error) {
      if (error instanceof NotFoundException || 
          error instanceof UnauthorizedException ||
          error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(`Failed to check in attendee: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async update(id: string, updateEventDto: UpdateEventDto): Promise<EventDocument> {
    try {
      const event = await this.findOne(id);
      
      // Validate states exist if being updated
      if (updateEventDto.states && updateEventDto.states.length > 0) {
        for (const stateId of updateEventDto.states) {
          const state = await this.statesService.findOne(stateId);
          if (!state) {
            throw new HttpException(`State with ID ${stateId} not found`, HttpStatus.BAD_REQUEST);
          }
        }
      }
      
      // Validate branches exist and belong to the specified states if being updated
      if (updateEventDto.branches && updateEventDto.branches.length > 0) {
        for (const branchId of updateEventDto.branches) {
          const branch = await this.branchesService.findOne(branchId);
          if (!branch) {
            throw new HttpException(`Branch with ID ${branchId} not found`, HttpStatus.BAD_REQUEST);
          }
          
          // Check if branch belongs to one of the specified states
          const statesToCheck = updateEventDto.states || event.states.map(s => s.toString());
          if (!statesToCheck.includes(branch.stateId.toString())) {
            throw new HttpException(`Branch ${branchId} does not belong to any of the specified states`, HttpStatus.BAD_REQUEST);
          }
        }
      }
      
      // Validate pickup stations exist and belong to the specified branches if being updated
      if (updateEventDto.pickupStations && updateEventDto.pickupStations.length > 0) {
        for (const pickupStation of updateEventDto.pickupStations) {
          const station = await this.pickupStationsService.findOne(pickupStation.pickupStationId);
          if (!station) {
            throw new HttpException(`Pickup station with ID ${pickupStation.pickupStationId} not found`, HttpStatus.BAD_REQUEST);
          }
          
          // Check if pickup station belongs to one of the specified branches
          const branchesToCheck = updateEventDto.branches || event.branches.map(b => b.toString());
          if (!branchesToCheck.includes(station.branchId.toString())) {
            throw new HttpException(`Pickup station ${pickupStation.pickupStationId} does not belong to any of the specified branches`, HttpStatus.BAD_REQUEST);
          }
        }
      }
      
      // Convert string IDs to ObjectIds for pickup stations if being updated
      const updateData = {
        ...updateEventDto,
        pickupStations: updateEventDto.pickupStations?.map(ps => ({
          ...ps,
          pickupStationId: new Types.ObjectId(ps.pickupStationId)
        }))
      };
      
      const updatedEvent = await this.eventModel
        .findByIdAndUpdate(id, updateData, { new: true })
        .populate('marketers', '-password')
        .populate('states', 'name code')
        .populate('branches', 'name location')
        .populate('pickupStations.pickupStationId', 'location')
        .exec();
        
      if (!updatedEvent) {
        throw new NotFoundException('Event not found');
      }
      
      return updatedEvent;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(`Failed to update event: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

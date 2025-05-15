import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { EventsService } from '../events/events.service';
import { AttendeesService } from '../attendees/attendees.service';
import { UsersService } from '../users/users.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Marketer, MarketerDocument } from '../schemas/marketer.schema';

@Injectable()
export class MarketersService {
  constructor(
    private readonly eventsService: EventsService,
    private readonly attendeesService: AttendeesService,
    private readonly usersService: UsersService,
    @InjectModel(Marketer.name) private marketerModel: Model<MarketerDocument>,
  ) {}

  async getAvailableEvents() {
    return this.eventsService.getActiveEvents();
  }
  async volunteerForEvent(eventId: string, marketerId: string) {
    console.log(`Marketer ${marketerId} volunteering for event ${eventId}`);
    const result = await this.eventsService.addMarketerToEvent(eventId, marketerId);
    
    // Verify that the marketer was actually added to the event
    const updatedEvent = await this.eventsService.findOne(eventId);
    const marketerId_ObjId = new Types.ObjectId(marketerId);
    const isMarketedAdded = updatedEvent.marketers.some(m => m.toString() === marketerId_ObjId.toString());
    console.log(`Was marketer successfully added to event? ${isMarketedAdded}`);
    
    return result;
  }

  async leaveEvent(eventId: string, marketerId: string) {
    return this.eventsService.removeMarketerFromEvent(eventId, marketerId);
  }
  async getMarketerEvents(marketerId: string) {
    const user = await this.usersService.findById(marketerId);
    
    // If the user has no events, return empty array
    if (!user.eventParticipation || user.eventParticipation.length === 0) {
      return [];
    }
    
    // Get all events the user has participated in using their eventParticipation array
    const eventIds = user.eventParticipation.map(id => id.toString());
    
    // Find all these events and return them
    const events = await this.eventsService.findAll();
    return events.filter(event => eventIds.includes(event._id.toString()));
  }  async registerAttendee(marketerId: string, eventId: string, attendeeData: any) {
    // Verify marketer is assigned to this event
    console.log(`Checking authorization for marketer ${marketerId} to register attendee for event ${eventId}`);
    
    const event = await this.eventsService.findOne(eventId);
    const marketerId_ObjId = new Types.ObjectId(marketerId);
      // Extract just the ID from each marketer object
    const marketerIds = event.marketers.map((m: any) => {
      // If m is already an ObjectId, use toString()
      if (m instanceof Types.ObjectId) {
        return m.toString();
      }
      
      // If m is a full user object (as returned by populate), extract the _id
      if (m && typeof m === 'object' && '_id' in m) {
        return m._id.toString();
      }
      
      // If m is something else, convert to string (fallback)
      return String(m);
    });
    
    console.log("Extracted marketer IDs from event:", marketerIds);
    console.log(`Marketer ID (as string) we're checking:`, marketerId);
    
    // Check if the marketer exists in the event's marketers array
    const isMarketerAuthorized = marketerIds.includes(marketerId);
    console.log(`Is marketer authorized:`, isMarketerAuthorized);
    
    if (!isMarketerAuthorized) {
      // Get user's eventParticipation for debugging
      const user = await this.usersService.findById(marketerId);
      console.log(`User's eventParticipation:`, user.eventParticipation.map(e => e.toString()));
      console.log(`Does user's eventParticipation include this event:`, user.eventParticipation.some(e => e.toString() === eventId));
      
      throw new UnauthorizedException('You are not authorized to register attendees for this event');
    }// If bus pickup is selected, validate the pickup location exists
    if (attendeeData.transportPreference === 'bus' && attendeeData.busPickup) {
      const validPickup = event.busPickups.some(
        pickup => pickup.location === attendeeData.busPickup.location &&
        new Date(pickup.departureTime).getTime() === new Date(attendeeData.busPickup.departureTime).getTime()
      );
      if (!validPickup) {
        throw new NotFoundException('Invalid bus pickup location');
      }
    }

    // Create attendee with marketer reference
    return this.attendeesService.create({
      ...attendeeData,
      event: eventId,
      registeredBy: marketerId,
    });
  }

  async updateAttendee(marketerId: string, attendeeId: string, updateData: any) {
    const attendee = await this.attendeesService.findOne(attendeeId);

    // Verify marketer registered this attendee
    if (attendee.registeredBy.toString() !== marketerId) {
      throw new UnauthorizedException('You can only edit attendees you registered');
    }
    // If updating bus pickup, validate the new pickup location
    if (updateData.transportPreference === 'bus' && updateData.busPickup) {      const event = await this.eventsService.findOne(attendee.event.toString());
      const validPickup = event.busPickups.some(
        pickup => pickup.location === updateData.busPickup.location &&
        new Date(pickup.departureTime).getTime() === new Date(updateData.busPickup.departureTime).getTime()
      );
      if (!validPickup) {
        throw new NotFoundException('Invalid bus pickup location');
      }
    }

    return this.attendeesService.update(attendeeId, updateData);
  }

  async removeAttendee(marketerId: string, attendeeId: string) {
    const attendee = await this.attendeesService.findOne(attendeeId);

    // Verify marketer registered this attendee
    if (attendee.registeredBy.toString() !== marketerId) {
      throw new UnauthorizedException('You can only remove attendees you registered');
    }

    return this.attendeesService.remove(attendeeId);
  }

  async getMarketerAttendees(marketerId: string, eventId?: string) {
    const query = { registeredBy: marketerId };
    if (eventId) {
      query['event'] = eventId;
    }
    return this.attendeesService.findByQuery(query);
  }

  // Analytics methods for marketer performance
  async getMarketerPerformanceStats(marketerId: string) {
    // Get the marketer
    const marketer = await this.marketerModel.findOne({ user: marketerId }).exec();
    if (!marketer) {
      // Create marketer profile if it doesn't exist
      const user = await this.usersService.findById(marketerId);
      if (!user) {
        throw new NotFoundException('Marketer not found');
      }
      
      const newMarketer = new this.marketerModel({ 
        user: marketerId,
        totalAttendeesRegistered: 0,
        attendeesPerEvent: new Map(),
        lastActivityDate: new Date()
      });
      await newMarketer.save();
      return {
        totalAttendeesRegistered: 0,
        attendeesPerEvent: {},
        eventsParticipated: 0,
        averageAttendeesPerEvent: 0
      };
    }

    // Calculate stats from existing data
    const attendees = await this.attendeesService.findByQuery({ registeredBy: marketerId });
    
    // Group attendees by event
    const eventMap = new Map();
    attendees.forEach(attendee => {
      const eventId = attendee.event.toString();
      if (!eventMap.has(eventId)) {
        eventMap.set(eventId, []);
      }
      eventMap.get(eventId).push(attendee);
    });
    
    return {
      totalAttendeesRegistered: attendees.length,
      attendeesPerEvent: Object.fromEntries([...eventMap].map(([k, v]) => [k, v.length])),
      eventsParticipated: eventMap.size,
      averageAttendeesPerEvent: eventMap.size ? (attendees.length / eventMap.size) : 0
    };
  }

  async getTopPerformingMarketers(limit: number = 10) {
    // Find all marketer users
    const marketers = await this.usersService.findByRole('marketer');
    
    // Get performance data for each
    const marketerStats = await Promise.all(
      marketers.map(async (marketer) => {
        const stats = await this.getMarketerPerformanceStats(marketer._id.toString());
        return {
          marketer: {
            id: marketer._id,
            name: marketer.name,
            email: marketer.email
          },
          stats
        };
      })
    );
    
    // Sort by total attendees registered
    return marketerStats
      .sort((a, b) => b.stats.totalAttendeesRegistered - a.stats.totalAttendeesRegistered)
      .slice(0, limit);
  }

  async getMarketerEventPerformance(marketerId: string, eventId: string) {
    const attendees = await this.attendeesService.findByQuery({
      registeredBy: marketerId,
      event: eventId
    });
    
    const event = await this.eventsService.findOne(eventId);
    
    return {
      event: {
        id: event._id,
        name: event.name,
        date: event.date
      },
      attendeesCount: attendees.length,
      attendees: attendees.map(attendee => ({
        id: attendee._id,
        name: attendee.name,
        email: attendee.email,
        transportPreference: attendee.transportPreference
      }))
    };
  }
}

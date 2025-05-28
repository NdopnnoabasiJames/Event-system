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
  }  async volunteerForEvent(eventId: string, marketerId: string) {
    return this.eventsService.addMarketerToEvent(eventId, marketerId);
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
    
    // Check if the marketer exists in the event's marketers array
    const isMarketerAuthorized = marketerIds.includes(marketerId);
    
    if (!isMarketerAuthorized) {
      throw new UnauthorizedException('You are not authorized to register attendees for this event');
    }    // If bus pickup is selected, validate the pickup station exists
    if (attendeeData.transportPreference === 'bus' && attendeeData.pickupStation) {
      // Verify the pickup station exists in the event
      const validStation = event.pickupStations.some(
        station => station.pickupStationId.toString() === attendeeData.pickupStation.toString()
      );
      if (!validStation) {
        throw new NotFoundException('Invalid pickup station for this event');
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
    }    // If updating bus pickup, validate the new pickup station
    if (updateData.transportPreference === 'bus' && updateData.pickupStation) {
      const event = await this.eventsService.findOne(attendee.event.toString());
      // Verify the pickup station exists in the event
      const validStation = event.pickupStations.some(
        station => station.pickupStationId.toString() === updateData.pickupStation.toString()
      );
      if (!validStation) {
        throw new NotFoundException('Invalid pickup station for this event');
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
        phone: attendee.phone,
        transportPreference: attendee.transportPreference,
        checkedIn: attendee.checkedIn || false,
        checkedInTime: attendee.checkedInTime,
        checkedInBy: attendee.checkedInBy
      }))
    };
  }
}

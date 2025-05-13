import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { EventsService } from '../events/events.service';
import { AttendeesService } from '../attendees/attendees.service';
import { UsersService } from '../users/users.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
    return this.eventsService.addMarketerToEvent(eventId, marketerId);
  }

  async leaveEvent(eventId: string, marketerId: string) {
    return this.eventsService.removeMarketerFromEvent(eventId, marketerId);
  }

  async getMarketerEvents(marketerId: string) {
    const user = await this.usersService.findById(marketerId);
    return this.eventsService.findAll().then(events =>
      events.filter(event => event.marketers.some(m => m.toString() === marketerId))
    );
  }

  async registerAttendee(marketerId: string, eventId: string, attendeeData: any) {
    // Verify marketer is assigned to this event
    const event = await this.eventsService.findOne(eventId);
    if (!event.marketers.some(m => m.toString() === marketerId)) {
      throw new UnauthorizedException('You are not authorized to register attendees for this event');
    }      // If bus pickup is selected, validate the pickup location exists
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

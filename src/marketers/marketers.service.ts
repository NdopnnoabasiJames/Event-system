import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { EventsService } from '../events/events.service';
import { AttendeesService } from '../attendees/attendees.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class MarketersService {
  constructor(
    private readonly eventsService: EventsService,
    private readonly attendeesService: AttendeesService,
    private readonly usersService: UsersService,
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
      events.filter(event => event.marketers.some(m => m._id.toString() === marketerId))
    );
  }

  async registerAttendee(marketerId: string, eventId: string, attendeeData: any) {
    // Verify marketer is assigned to this event
    const event = await this.eventsService.findOne(eventId);
    if (!event.marketers.some(m => m._id.toString() === marketerId)) {
      throw new UnauthorizedException('You are not authorized to register attendees for this event');
    }

    // If bus pickup is selected, validate the pickup location exists
    if (attendeeData.transportPreference === 'bus' && attendeeData.busPickupId) {
      const validPickup = event.busPickups.some(
        pickup => pickup._id.toString() === attendeeData.busPickupId
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
    if (updateData.transportPreference === 'bus' && updateData.busPickupId) {
      const event = await this.eventsService.findOne(attendee.event.toString());
      const validPickup = event.busPickups.some(
        pickup => pickup._id.toString() === updateData.busPickupId
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
}

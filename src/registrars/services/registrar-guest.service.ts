import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Guest, GuestDocument } from '../../schemas/guest.schema';
import { Event, EventDocument } from '../../schemas/event.schema';

@Injectable()
export class RegistrarGuestService {
  constructor(
    @InjectModel(Guest.name) private guestModel: Model<GuestDocument>,
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
  ) {}

  async getEventGuests(eventId: string, registrarId: string): Promise<GuestDocument[]> {
    try {
      // Verify registrar is approved for this event
      const event = await this.eventModel.findById(eventId).exec();
      if (!event) {
        throw new NotFoundException('Event not found');
      }

      const registrarRequest = event.registrarRequests?.find(
        req => req.registrarId.toString() === registrarId && req.status === 'Approved'
      );

      if (!registrarRequest) {
        throw new BadRequestException('You are not approved to access guests for this event');
      }

      // Get all guests for this event
      return await this.guestModel
        .find({ event: eventId })
        .populate('registeredBy', 'name email')
        .populate('checkedInBy', 'name email')
        .populate({
          path: 'event',
          select: 'name title date time location description'
        })
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      throw new BadRequestException(`Failed to get event guests: ${error.message}`);
    }
  }

  async searchGuestByPhone(eventId: string, phone: string, registrarId: string): Promise<GuestDocument[]> {
    try {
      // Verify registrar is approved for this event
      const event = await this.eventModel.findById(eventId).exec();
      if (!event) {
        throw new NotFoundException('Event not found');
      }

      const registrarRequest = event.registrarRequests?.find(
        req => req.registrarId.toString() === registrarId && req.status === 'Approved'
      );

      if (!registrarRequest) {
        throw new BadRequestException('You are not approved to access guests for this event');
      }

      // Search guests by phone number
      return await this.guestModel
        .find({ 
          event: eventId,
          phone: { $regex: phone, $options: 'i' }
        })
        .populate('registeredBy', 'name email')
        .populate('checkedInBy', 'name email')
        .populate({
          path: 'event',
          select: 'name title date time location description'
        })
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      throw new BadRequestException(`Failed to search guests: ${error.message}`);
    }
  }

  async checkInGuest(eventId: string, guestId: string, registrarId: string): Promise<{ message: string; guest: GuestDocument }> {
    try {
      // Verify registrar is approved for this event
      const event = await this.eventModel.findById(eventId).exec();
      if (!event) {
        throw new NotFoundException('Event not found');
      }

      const registrarRequest = event.registrarRequests?.find(
        req => req.registrarId.toString() === registrarId && req.status === 'Approved'
      );

      if (!registrarRequest) {
        throw new BadRequestException('You are not approved to check in guests for this event');
      }

      // Find the guest
      const guest = await this.guestModel.findById(guestId).exec();
      if (!guest) {
        throw new NotFoundException('Guest not found');
      }

      // Verify guest belongs to this event
      if (guest.event.toString() !== eventId) {
        throw new BadRequestException('Guest does not belong to this event');
      }      // Check if already checked in
      if (guest.checkedIn) {
        throw new BadRequestException('Guest is already checked in');
      }

      // Check in the guest
      guest.checkedIn = true;
      guest.checkedInBy = registrarId as any;
      guest.checkedInTime = new Date();

      await guest.save();

      // Populate the updated guest data
      const updatedGuest = await this.guestModel
        .findById(guestId)
        .populate('registeredBy', 'name email')
        .populate('checkedInBy', 'name email')
        .populate({
          path: 'event',
          select: 'name title date time location description'
        })
        .exec();

      return {
        message: 'Guest checked in successfully',
        guest: updatedGuest
      };
    } catch (error) {
      throw new BadRequestException(`Failed to check in guest: ${error.message}`);
    }
  }
}

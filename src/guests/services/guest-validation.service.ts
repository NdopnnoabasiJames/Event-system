import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Guest, GuestDocument } from '../../schemas/guest.schema';
import { Event, EventDocument } from '../../schemas/event.schema';
import { PickupStation, PickupStationDocument } from '../../schemas/pickup-station.schema';
import { GuestStatus } from '../enums/guest-status.enum';

@Injectable()
export class GuestValidationService {
  constructor(
    @InjectModel(Guest.name) private guestModel: Model<GuestDocument>,
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    @InjectModel(PickupStation.name) private pickupStationModel: Model<PickupStationDocument>,
  ) {}

  /**
   * Validate guest data and business rules
   */
  async validateGuestData(guestData: any, eventId: string): Promise<void> {
    // Check for duplicate phone number in the same event
    const existingGuest = await this.guestModel.findOne({
      phone: guestData.phone,
      event: eventId
    });

    if (existingGuest) {
      throw new BadRequestException('A guest with this phone number is already registered for this event');
    }

    // Validate email format if provided
    if (guestData.email && !this.isValidEmail(guestData.email)) {
      throw new BadRequestException('Invalid email format');
    }

    // Validate phone number format
    if (!this.isValidPhoneNumber(guestData.phone)) {
      throw new BadRequestException('Invalid phone number format');
    }

    // Validate pickup station if bus transport is selected
    if (guestData.transportPreference === 'bus' && guestData.pickupStation) {
      await this.validatePickupStation(guestData.pickupStation, eventId);
    }
  }

  /**
   * Validate pickup station assignment
   */
  async validatePickupStation(pickupStationId: string, eventId: string): Promise<void> {
    const event = await this.eventModel.findById(eventId);
    if (!event) {
      throw new BadRequestException('Event not found');
    }

    const isValidStation = event.pickupStations?.some(
      station => station.pickupStationId.toString() === pickupStationId
    );

    if (!isValidStation) {
      throw new BadRequestException('Pickup station not available for this event');
    }

    // Check pickup station capacity
    const station = await this.pickupStationModel.findById(pickupStationId);
    if (!station || !station.isActive) {
      throw new BadRequestException('Pickup station is not active');
    }
  }
  /**
   * Validate guest status transition
   */
  validateStatusTransition(currentStatus: GuestStatus, newStatus: GuestStatus): boolean {
    const validTransitions: Record<GuestStatus, GuestStatus[]> = {
      [GuestStatus.INVITED]: [GuestStatus.CHECKED_IN, GuestStatus.NO_SHOW],
      [GuestStatus.CHECKED_IN]: [], // Final state - cannot change once checked in
      [GuestStatus.NO_SHOW]: [GuestStatus.CHECKED_IN] // Late check-in allowed
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  /**
   * Check if guest can be edited
   */
  canEditGuest(guest: GuestDocument): boolean {
    const event = guest.event as any;
    const eventDate = new Date(event.date);
    const now = new Date();
    
    // Cannot edit if event has already started
    if (eventDate <= now) {
      return false;
    }

    // Cannot edit if guest is already checked in
    if (guest.checkedIn || guest.status === GuestStatus.CHECKED_IN) {
      return false;
    }

    return true;
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number format (Nigerian format)
   */
  private isValidPhoneNumber(phone: string): boolean {
    // Accept Nigerian phone numbers: +234XXXXXXXXXX, 234XXXXXXXXXX, 0XXXXXXXXXXX, XXXXXXXXXXX
    const phoneRegex = /^(\+?234|0)?[789]\d{9}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }
}

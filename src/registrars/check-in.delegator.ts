/**
 * Handle check-in related services by delegating to the CheckInService
 */
import { Injectable } from '@nestjs/common';
import { CheckInService } from './services/check-in.service';
import { GuestSearchDto, CheckInGuestDto } from './dto';

@Injectable()
export class CheckInDelegator {
  constructor(private readonly checkInService: CheckInService) {}

  async searchGuests(searchDto: GuestSearchDto, userId: string) {
    return this.checkInService.searchGuests(searchDto, userId);
  }

  async checkInGuest(checkInDto: CheckInGuestDto, registrarId: string) {
    return this.checkInService.checkInGuest(checkInDto, registrarId);
  }

  async getCheckInStatistics(eventId: string, zoneId?: string) {
    return this.checkInService.getCheckInStatistics(eventId, zoneId);
  }

  async getRegistrarDashboard(registrarId: string) {
    return this.checkInService.getRegistrarDashboard(registrarId);
  }
}

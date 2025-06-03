import { Controller, Post, Get, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CheckInService } from '../services/check-in.service';
import { GuestSearchDto, CheckInGuestDto } from '../dto';

@Controller('check-in')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CheckInController {
  constructor(private readonly checkInService: CheckInService) {}
  @Post('search')
  @Roles(Role.REGISTRAR)
  async searchGuests(@Body() searchDto: GuestSearchDto, @Req() req) {
    return this.checkInService.searchGuests(searchDto, req.user.userId);
  }

  @Post('guest')
  @Roles(Role.REGISTRAR)
  async checkInGuest(@Body() checkInDto: CheckInGuestDto, @Req() req) {
    return this.checkInService.checkInGuest(checkInDto, req.user.userId);
  }

  @Get('statistics/event/:eventId')
  @Roles(Role.REGISTRAR, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN, Role.STATE_ADMIN, Role.SUPER_ADMIN)
  async getCheckInStatistics(
    @Param('eventId') eventId: string,
    @Query('zoneId') zoneId?: string
  ) {
    return this.checkInService.getCheckInStatistics(eventId, zoneId);
  }

  @Get('dashboard')
  @Roles(Role.REGISTRAR)
  async getRegistrarDashboard(@Req() req) {
    return this.checkInService.getRegistrarDashboard(req.user.userId);
  }
}

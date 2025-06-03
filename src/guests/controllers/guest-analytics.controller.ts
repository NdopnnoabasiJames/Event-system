import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { GuestAnalyticsService } from '../services/guest-analytics.service';

@Controller('admin/guests/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GuestAnalyticsController {
  constructor(
    private readonly guestAnalyticsService: GuestAnalyticsService,
  ) {}
  /**
   * Get basic analytics for admin's jurisdiction
   */
  @Get('basic')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  async getBasicAnalytics(
    @Request() req,
    @Query('eventId') eventId?: string
  ) {
    return this.guestAnalyticsService.getBasicAnalytics(req.user.userId, eventId);
  }
  /**
   * Get registration trends
   */
  @Get('trends')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  async getRegistrationTrends(
    @Request() req,
    @Query('days') days?: number
  ) {
    return this.guestAnalyticsService.getRegistrationTrends(req.user.userId, days);
  }
  /**
   * Get worker performance analytics
   */
  @Get('worker-performance')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  async getWorkerPerformance(
    @Request() req,
    @Query('eventId') eventId?: string
  ) {
    return this.guestAnalyticsService.getWorkerPerformance(req.user.userId, eventId);
  }

  /**
   * Get event summary analytics
   */
  @Get('events')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  async getEventSummary(@Request() req) {
    return this.guestAnalyticsService.getEventSummary(req.user.userId);
  }
}

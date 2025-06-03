import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { EventsService } from '../events/events.service';
import { RegistrarsService } from './registrars.service';
import { CheckInDelegator } from './check-in.delegator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { 
  RegistrarRegistrationDto,
  ZoneAssignmentDto,
  SingleZoneAssignmentDto,
  RemoveZoneAssignmentDto,
  UpdateRegistrarProfileDto, 
  ApproveRegistrarDto, 
  RejectRegistrarDto,
  GuestSearchDto,
  CheckInGuestDto
} from './dto';

@Controller('registrars')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RegistrarsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly registrarsService: RegistrarsService,
    private readonly checkInDelegator: CheckInDelegator
  ) {}

  // Phase 4.1: Registrar Registration & Assignment

  /**
   * Public endpoint - Registrar registration (no auth required for initial registration)
   */
  @Post('register')
  async registerRegistrar(@Body() registrationDto: RegistrarRegistrationDto) {
    return this.registrarsService.registerRegistrar(registrationDto);
  }

  /**
   * Get pending registrars for Branch Admin approval
   */
  @Get('pending')
  @Roles(Role.BRANCH_ADMIN)
  async getPendingRegistrars(@Request() req) {
    return this.registrarsService.getPendingRegistrars(req.user.userId);
  }

  /**
   * Approve registrar by Branch Admin
   */
  @Post('approve')
  @Roles(Role.BRANCH_ADMIN)
  async approveRegistrar(@Body() approvalDto: ApproveRegistrarDto, @Request() req) {
    return this.registrarsService.approveRegistrar(approvalDto, req.user.userId);
  }

  /**
   * Reject registrar by Branch Admin
   */
  @Post('reject')
  @Roles(Role.BRANCH_ADMIN)
  async rejectRegistrar(@Body() rejectDto: RejectRegistrarDto, @Request() req) {
    return this.registrarsService.rejectRegistrar(rejectDto, req.user.userId);
  }

  /**
   * Zone assignment by Branch/Zonal Admins - Multiple zones
   */
  @Post('assign-zones')
  @Roles(Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  async assignZones(@Body() assignmentDto: ZoneAssignmentDto, @Request() req) {
    return this.registrarsService.assignZonesToRegistrar(assignmentDto, req.user.userId);
  }

  /**
   * Zone assignment by Branch/Zonal Admins - Single zone
   */
  @Post('assign-zone')
  @Roles(Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  async assignSingleZone(@Body() assignmentDto: SingleZoneAssignmentDto, @Request() req) {
    return this.registrarsService.assignSingleZone(assignmentDto, req.user.userId);
  }

  /**
   * Remove zone assignment
   */
  @Delete('remove-zone-assignment')
  @Roles(Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  async removeZoneAssignment(@Body() removeDto: RemoveZoneAssignmentDto, @Request() req) {
    return this.registrarsService.removeZoneAssignment(removeDto, req.user.userId);
  }

  /**
   * Get registrars by branch (for Branch Admins)
   */
  @Get('branch')
  @Roles(Role.BRANCH_ADMIN)
  async getRegistrarsByBranch(@Request() req) {
    return this.registrarsService.getRegistrarsByBranch(req.user.userId);
  }

  /**
   * Get all approved registrars (filtered by admin hierarchy)
   */
  @Get('approved')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  async getAllApprovedRegistrars(@Request() req) {
    return this.registrarsService.getAllApprovedRegistrars(req.user.userId);
  }

  /**
   * Get registrars assigned to specific zone
   */
  @Get('zone/:zoneId')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  async getRegistrarsByZone(@Param('zoneId') zoneId: string, @Request() req) {
    return this.registrarsService.getRegistrarsByZone(zoneId, req.user.userId);
  }

  /**
   * Get registrar assignments summary
   */
  @Get('assignments-summary')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  async getRegistrarAssignmentsSummary(@Request() req) {
    return this.registrarsService.getRegistrarAssignmentsSummary(req.user.userId);
  }

  // Phase 4.1: Registrar Profile Management

  /**
   * Get registrar profile
   */
  @Get('profile/:registrarId')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN, Role.REGISTRAR)
  async getRegistrarProfile(@Param('registrarId') registrarId: string) {
    return this.registrarsService.getRegistrarProfile(registrarId);
  }

  /**
   * Update registrar profile
   */
  @Put('profile/:registrarId')
  @Roles(Role.SUPER_ADMIN, Role.BRANCH_ADMIN, Role.REGISTRAR)
  async updateRegistrarProfile(
    @Param('registrarId') registrarId: string,
    @Body() updateDto: UpdateRegistrarProfileDto,
    @Request() req
  ) {
    return this.registrarsService.updateRegistrarProfile(registrarId, updateDto, req.user.userId);
  }

  // Existing endpoint - Get event assignments for registrar
  @Get('assignments')
  @Roles(Role.REGISTRAR)
  async getAssignments(@Request() req) {
    const userId = req.user.userId;
    return this.eventsService.getRegistrarAssignments(userId);
  }

  // Phase 4.2: Check-in System
  /**
   * Search for guests by name or phone number
   */
  @Post('guests/search')
  @Roles(Role.REGISTRAR)
  async searchGuests(@Body() searchDto: GuestSearchDto, @Request() req) {
    return this.checkInDelegator.searchGuests(searchDto, req.user.userId);
  }
  /**
   * Check in a guest for an event
   */
  @Post('guests/check-in')
  @Roles(Role.REGISTRAR)
  async checkInGuest(@Body() checkInDto: CheckInGuestDto, @Request() req) {
    return this.checkInDelegator.checkInGuest(checkInDto, req.user.userId);
  }
  /**
   * Get check-in statistics for an event
   */
  @Get('events/:eventId/statistics')
  @Roles(Role.REGISTRAR, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN, Role.SUPER_ADMIN)
  async getCheckInStatistics(@Param('eventId') eventId: string, @Query('zoneId') zoneId?: string) {
    return this.checkInDelegator.getCheckInStatistics(eventId, zoneId);
  }
  /**
   * Get registrar dashboard with assigned zones and check-in statistics
   */
  @Get('dashboard')
  @Roles(Role.REGISTRAR)
  async getRegistrarDashboard(@Request() req) {
    return this.checkInDelegator.getRegistrarDashboard(req.user.userId);
  }
}
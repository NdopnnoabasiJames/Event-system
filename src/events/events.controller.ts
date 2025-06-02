import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Request,
  HttpStatus,
  Put,
  Patch,
  Query,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { HierarchicalEventService } from './hierarchical-event.service';
import { HierarchicalEventCreationService } from './hierarchical-event-creation.service';
import { HierarchicalEventManagementService } from './services/hierarchical-event-management.service';
import { 
  CascadeStatus, 
  ParticipationOptions, 
  StatusTimelineEntry, 
  EventCascadeFlow 
} from './interfaces/event-management.interfaces';
import { CreateEventDto } from './dto/create-event.dto';
import { CreateHierarchicalEventDto } from './dto/create-hierarchical-event.dto';
import { UpdateEventAvailabilityDto } from './dto/update-event-availability.dto';
import { SelectBranchesDto, SelectZonesDto } from './dto/hierarchical-selection.dto';
import { 
  AssignPickupStationsDto, 
  UpdatePickupStationAssignmentDto, 
  RemovePickupStationAssignmentDto 
} from './dto/assign-pickup-stations.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { EventDocument } from '../schemas/event.schema';

class BusPickupRequest {
  location: string;
  departureTime: string;
}

@Controller('events')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EventsController {  constructor(
    private readonly eventsService: EventsService,
    private readonly hierarchicalEventService: HierarchicalEventService,
    private readonly hierarchicalEventCreationService: HierarchicalEventCreationService,
    private readonly hierarchicalEventManagementService: HierarchicalEventManagementService,
  ) {}
  @Post()
  @Roles(Role.SUPER_ADMIN)
  create(@Body() createEventDto: CreateEventDto) {
    return this.eventsService.create(createEventDto);
  }

  @Get()
  findAll() {
    return this.eventsService.findAll();
  }

  @Get('active')
  getActiveEvents() {
    return this.eventsService.getActiveEvents();
  }

  @Get('upcoming')
  async getUpcomingEvents() {
    const today = new Date();
    return this.eventsService.findUpcoming(today);
  }

  @Get('state/:state')
  getEventsByState(@Param('state') state: string) {
    return this.eventsService.getEventsByState(state);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }
  @Post(':id/bus-pickup')
  @Roles(Role.SUPER_ADMIN)
  addBusPickup(
    @Param('id') id: string,
    @Body() busPickupData: BusPickupRequest,
  ) {
    return this.eventsService.addBusPickup(
      id,
      busPickupData.location,
      busPickupData.departureTime,
    );
  }
  @Post(':id/join')
  @Roles(Role.WORKER)
  joinEvent(@Param('id') id: string, @Request() req) {
    return this.eventsService.addWorkerToEvent(id, req.user.userId);
  }

  @Delete(':id/leave')
  @Roles(Role.WORKER)
  leaveEvent(@Param('id') id: string, @Request() req) {
    return this.eventsService.removeWorkerFromEvent(id, req.user.userId);
  }
  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.eventsService.remove(id);
  }

    @Post(':eventId/registrar-requests')
  @Roles(Role.REGISTRAR)
  async requestRegistrar(@Param('eventId') eventId: string, @Request() req) {
    return this.eventsService.requestRegistrar(eventId, req.user.userId);
  }
  @Get('registrar-requests/pending')
  @Roles(Role.SUPER_ADMIN)
    async getAllPendingRegistrarRequests() {
    return this.eventsService.getAllPendingRegistrarRequests();
  }
  @Post(':eventId/registrar-requests/:requestId/review')
  @Roles(Role.SUPER_ADMIN)
  async reviewRegistrarRequest(
    @Param('eventId') eventId: string,
    @Param('requestId') requestId: string,
    @Body('approve') approve: boolean,
    @Request() req
  ) {
    return this.eventsService.reviewRegistrarRequest(eventId, requestId, approve, req.user.userId);
  }@Get('registrar-requests/approved')
  @Roles(Role.SUPER_ADMIN)
  async getAllApprovedRegistrars() {
    return this.eventsService.getAllApprovedRegistrars();
  }

  @Delete(':eventId/registrar-requests')
  @Roles(Role.REGISTRAR)
  async cancelRegistrarRequest(@Param('eventId') eventId: string, @Request() req) {
    return this.eventsService.cancelRegistrarRequest(eventId, req.user.userId);
  }
  @Post(':eventId/check-in')
  @Roles(Role.REGISTRAR)
  async checkInGuest(
    @Param('eventId') eventId: string, 
    @Body('phone') phone: string,
    @Request() req
  ) {
    return this.eventsService.checkInGuest(eventId, phone, req.user.userId);
  }

  // Hierarchical Event Creation Endpoints
  @Post('hierarchical')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  async createHierarchicalEvent(@Body() createEventDto: CreateHierarchicalEventDto, @Request() req) {
    const { userId, role } = req.user;

    // Route to appropriate creation method based on role
    if (role === Role.SUPER_ADMIN) {
      return this.hierarchicalEventCreationService.createSuperAdminEvent(createEventDto, userId);
    } else if (role === Role.STATE_ADMIN) {
      return this.hierarchicalEventCreationService.createStateAdminEvent(createEventDto, userId);
    } else if (role === Role.BRANCH_ADMIN) {
      return this.hierarchicalEventCreationService.createBranchAdminEvent(createEventDto, userId);
    } else if (role === Role.ZONAL_ADMIN) {
      return this.hierarchicalEventCreationService.createZonalAdminEvent(createEventDto, userId);
    }
  }

  @Put('select-branches')
  @Roles(Role.STATE_ADMIN)
  async selectBranches(@Body() selectBranchesDto: SelectBranchesDto, @Request() req) {
    const { userId } = req.user;
    return this.hierarchicalEventCreationService.selectBranchesForEvent(
      selectBranchesDto.eventId,
      selectBranchesDto.selectedBranches,
      userId
    );
  }

  @Put('select-zones')
  @Roles(Role.BRANCH_ADMIN)
  async selectZones(@Body() selectZonesDto: SelectZonesDto, @Request() req) {
    const { userId } = req.user;
    return this.hierarchicalEventCreationService.selectZonesForEvent(
      selectZonesDto.eventId,
      selectZonesDto.selectedZones,
      userId
    );
  }

  @Get('accessible')
  async getAccessibleEvents(@Request() req) {
    const { userId } = req.user;
    return this.hierarchicalEventCreationService.getAccessibleEvents(userId);
  }

  @Get('needing-branch-selection')
  @Roles(Role.STATE_ADMIN)
  async getEventsNeedingBranchSelection(@Request() req) {
    const { userId } = req.user;
    return this.hierarchicalEventCreationService.getEventsNeedingBranchSelection(userId);
  }

  @Get('needing-zone-selection')
  @Roles(Role.BRANCH_ADMIN)
  async getEventsNeedingZoneSelection(@Request() req) {
    const { userId } = req.user;
    return this.hierarchicalEventCreationService.getEventsNeedingZoneSelection(userId);
  }
  @Put('availability')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN)
  async updateEventAvailability(@Body() updateDto: UpdateEventAvailabilityDto, @Request() req) {
    const { userId } = req.user;
    return this.hierarchicalEventCreationService.updateEventAvailability(updateDto, userId);
  }

  // Phase 6: Pickup Station Assignment Endpoints for Zonal Admins

  @Get('for-pickup-assignment')
  @Roles(Role.ZONAL_ADMIN)
  async getEventsForPickupAssignment(@Request() req) {
    const { userId } = req.user;
    return this.hierarchicalEventCreationService.getEventsForPickupAssignment(userId);
  }

  @Get('available-pickup-stations')
  @Roles(Role.ZONAL_ADMIN)
  async getAvailablePickupStations(@Request() req) {
    const { userId } = req.user;
    return this.hierarchicalEventCreationService.getAvailablePickupStations(userId);
  }

  @Get(':eventId/pickup-stations')
  @Roles(Role.ZONAL_ADMIN)
  async getEventPickupStations(@Param('eventId') eventId: string, @Request() req) {
    const { userId } = req.user;
    return this.hierarchicalEventCreationService.getEventPickupStations(eventId, userId);
  }

  @Post('assign-pickup-stations')
  @Roles(Role.ZONAL_ADMIN)
  async assignPickupStations(@Body() assignDto: AssignPickupStationsDto, @Request() req) {
    const { userId } = req.user;
    return this.hierarchicalEventCreationService.assignPickupStations(assignDto, userId);
  }

  @Put('update-pickup-station-assignment')
  @Roles(Role.ZONAL_ADMIN)
  async updatePickupStationAssignment(@Body() updateDto: UpdatePickupStationAssignmentDto, @Request() req) {
    const { userId } = req.user;
    return this.hierarchicalEventCreationService.updatePickupStationAssignment(updateDto, userId);
  }  @Delete('remove-pickup-station-assignment')
  @Roles(Role.ZONAL_ADMIN)
  async removePickupStationAssignment(@Body() removeDto: RemovePickupStationAssignmentDto, @Request() req) {
    const { userId } = req.user;
    return this.hierarchicalEventCreationService.removePickupStationAssignment(removeDto, userId);
  }

  // Phase 3.2: Enhanced Event Management Endpoints
  // Event cascade flow management
  @Get(':eventId/cascade-status')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  async getEventCascadeStatus(@Param('eventId') eventId: string, @Request() req): Promise<CascadeStatus> {
    const { userId } = req.user;
    return this.hierarchicalEventManagementService.getEventCascadeStatus(eventId, userId);
  }

  @Get(':eventId/participation-options')
  @Roles(Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  async getEventParticipationOptions(@Param('eventId') eventId: string, @Request() req): Promise<ParticipationOptions> {
    const { userId } = req.user;
    return this.hierarchicalEventManagementService.getEventParticipationOptions(eventId, userId);
  }

  @Patch(':eventId/participation-status')
  @Roles(Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  async updateParticipationStatus(
    @Param('eventId') eventId: string,
    @Body() body: { status: 'participating' | 'not_participating' | 'pending'; reason?: string },
    @Request() req
  ) {
    const { userId } = req.user;
    return this.hierarchicalEventManagementService.updateParticipationStatus(eventId, userId, body.status, body.reason);
  }
  // Event status tracking
  @Get(':eventId/status-timeline')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  async getEventStatusTimeline(@Param('eventId') eventId: string, @Request() req): Promise<StatusTimelineEntry[]> {
    const { userId } = req.user;
    return this.hierarchicalEventManagementService.getEventStatusTimeline(eventId, userId);
  }

  @Patch(':eventId/status')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  async updateEventStatus(
    @Param('eventId') eventId: string,
    @Body() body: { 
      status: 'draft' | 'published' | 'in_progress' | 'completed' | 'cancelled';
      statusReason?: string;
    },
    @Request() req
  ) {
    const { userId } = req.user;
    return this.hierarchicalEventManagementService.updateEventStatus(eventId, userId, body.status, body.statusReason);
  }
  // Enhanced event flow tracking
  @Get('by-status/:status')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  async getEventsByStatus(
    @Param('status') status: string,
    @Request() req,
    @Query('includeSubordinateEvents') includeSubordinateEvents?: string
  ) {
    const { userId } = req.user;
    return this.hierarchicalEventManagementService.getEventsByStatus(
      userId, 
      status,
      includeSubordinateEvents === 'true'
    );
  }

  @Get('pending-participation')
  @Roles(Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  async getEventsPendingParticipation(@Request() req) {
    const { userId } = req.user;
    return this.hierarchicalEventManagementService.getEventsPendingParticipation(userId);
  }
  // Cascade flow visibility
  @Get(':eventId/cascade-flow')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  async getEventCascadeFlow(@Param('eventId') eventId: string, @Request() req): Promise<EventCascadeFlow> {
    const { userId } = req.user;
    return this.hierarchicalEventManagementService.getEventCascadeFlow(eventId, userId);
  }

  @Get('registrar-assignments')
  @Roles(Role.REGISTRAR)
  async getRegistrarAssignments(@Request() req) {
    return this.eventsService.getRegistrarAssignments(req.user.userId);
  }
}

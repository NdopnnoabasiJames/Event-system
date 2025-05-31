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
} from '@nestjs/common';
import { EventsService } from './events.service';
import { HierarchicalEventService } from './hierarchical-event.service';
import { HierarchicalEventCreationService } from './hierarchical-event-creation.service';
import { CreateEventDto } from './dto/create-event.dto';
import { CreateHierarchicalEventDto } from './dto/create-hierarchical-event.dto';
import { UpdateEventAvailabilityDto } from './dto/update-event-availability.dto';
import { SelectBranchesDto, SelectZonesDto } from './dto/hierarchical-selection.dto';
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
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly hierarchicalEventService: HierarchicalEventService,
    private readonly hierarchicalEventCreationService: HierarchicalEventCreationService,
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
  @Roles(Role.MARKETER)
  joinEvent(@Param('id') id: string, @Request() req) {
    return this.eventsService.addMarketerToEvent(id, req.user.userId);
  }

  @Delete(':id/leave')
  @Roles(Role.MARKETER)
  leaveEvent(@Param('id') id: string, @Request() req) {
    return this.eventsService.removeMarketerFromEvent(id, req.user.userId);
  }
  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.eventsService.remove(id);
  }

  @Post(':eventId/concierge-requests')
  @Roles(Role.CONCIERGE)
  async requestConcierge(@Param('eventId') eventId: string, @Request() req) {
    return this.eventsService.requestConcierge(eventId, req.user.userId);
  }
  @Get('concierge-requests/pending')
  @Roles(Role.SUPER_ADMIN)
  async getAllPendingConciergeRequests() {
    return this.eventsService.getAllPendingConciergeRequests();
  }
  @Post(':eventId/concierge-requests/:requestId/review')
  @Roles(Role.SUPER_ADMIN)
  async reviewConciergeRequest(
    @Param('eventId') eventId: string,
    @Param('requestId') requestId: string,
    @Body('approve') approve: boolean,
    @Request() req
  ) {
    return this.eventsService.reviewConciergeRequest(eventId, requestId, approve, req.user.userId);
  }
  @Get('concierge-requests/approved')
  @Roles(Role.SUPER_ADMIN)
  async getAllApprovedConcierges() {
    return this.eventsService.getAllApprovedConcierges();
  }

  @Delete(':eventId/concierge-requests')
  @Roles(Role.CONCIERGE)
  async cancelConciergeRequest(@Param('eventId') eventId: string, @Request() req) {
    return this.eventsService.cancelConciergeRequest(eventId, req.user.userId);
  }
  @Post(':eventId/check-in')
  @Roles(Role.CONCIERGE)
  async checkInAttendee(
    @Param('eventId') eventId: string, 
    @Body('phone') phone: string,
    @Request() req
  ) {
    return this.eventsService.checkInAttendee(eventId, phone, req.user.userId);
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
}

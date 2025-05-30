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
  Patch,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { HierarchicalEventService } from './hierarchical-event.service';
import { CreateEventDto } from './dto/create-event.dto';
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
  ) {}
  @Post()
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN)
  async create(@Body() createEventDto: CreateEventDto, @Request() req) {
    const { userId, role, state, branch } = req.user;

    // Route to appropriate creation method based on role
    if (role === Role.SUPER_ADMIN) {
      return this.hierarchicalEventService.createSuperAdminEvent(createEventDto, userId);
    } else if (role === Role.STATE_ADMIN) {
      return this.hierarchicalEventService.createStateAdminEvent(createEventDto, userId, state);
    } else if (role === Role.BRANCH_ADMIN) {
      return this.hierarchicalEventService.createBranchAdminEvent(createEventDto, userId, state, branch);
    }
  }

  @Get()
  async findAll(@Request() req) {
    const { userId, role, state, branch } = req.user;

    // Route to appropriate fetch method based on role
    if (role === Role.SUPER_ADMIN) {
      return this.hierarchicalEventService.getSuperAdminEvents();
    } else if (role === Role.STATE_ADMIN) {
      return this.hierarchicalEventService.getStateAdminEvents(state);
    } else if (role === Role.BRANCH_ADMIN) {
      return this.hierarchicalEventService.getBranchAdminEvents(state, branch);
    } else {
      // For other roles (MARKETER, USER, etc.), return all events
      return this.eventsService.findAll();
    }
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

  // Hierarchical Event Management Endpoints

  @Post(':eventId/select-branches')
  @Roles(Role.STATE_ADMIN)
  async selectBranchesForEvent(
    @Param('eventId') eventId: string,
    @Body('selectedBranches') selectedBranches: string[],
    @Request() req
  ) {
    const { userId, state } = req.user;
    return this.hierarchicalEventService.selectBranchesForEvent(eventId, selectedBranches, userId, state);
  }

  @Get('dashboard/super-admin')
  @Roles(Role.SUPER_ADMIN)
  async getSuperAdminDashboard() {
    return this.hierarchicalEventService.getSuperAdminEvents();
  }

  @Get('dashboard/state-admin')
  @Roles(Role.STATE_ADMIN)
  async getStateAdminDashboard(@Request() req) {
    const { state } = req.user;
    return this.hierarchicalEventService.getStateAdminEvents(state);
  }

  @Get('dashboard/branch-admin')
  @Roles(Role.BRANCH_ADMIN)
  async getBranchAdminDashboard(@Request() req) {
    const { state, branch } = req.user;
    return this.hierarchicalEventService.getBranchAdminEvents(state, branch);
  }
  @Get('my-events')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN)
  async getMyEvents(@Request() req) {
    const { userId, role, state, branch } = req.user;

    if (role === Role.SUPER_ADMIN) {
      return this.hierarchicalEventService.getSuperAdminEvents();
    } else if (role === Role.STATE_ADMIN) {
      return this.hierarchicalEventService.getStateAdminEvents(state);
    } else if (role === Role.BRANCH_ADMIN) {
      return this.hierarchicalEventService.getBranchAdminEvents(state, branch);
    }
  }

  // Hierarchical Event Creation Endpoints

  @Post('hierarchical/super-admin')
  @Roles(Role.SUPER_ADMIN)
  async createSuperAdminEvent(@Body() createEventDto: CreateEventDto, @Request() req) {
    const { userId } = req.user;
    return this.hierarchicalEventService.createSuperAdminEvent(createEventDto, userId);
  }

  @Post('hierarchical/state-admin')
  @Roles(Role.STATE_ADMIN)
  async createStateAdminEvent(@Body() createEventDto: CreateEventDto, @Request() req) {
    const { userId, state } = req.user;
    return this.hierarchicalEventService.createStateAdminEvent(createEventDto, userId, state);
  }

  @Post('hierarchical/branch-admin')
  @Roles(Role.BRANCH_ADMIN)
  async createBranchAdminEvent(@Body() createEventDto: CreateEventDto, @Request() req) {
    const { userId, state, branch } = req.user;
    return this.hierarchicalEventService.createBranchAdminEvent(createEventDto, userId, state, branch);
  }

  @Get('hierarchical/my-events')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN)
  async getHierarchicalMyEvents(@Request() req) {
    const { userId, role, state, branch } = req.user;

    if (role === Role.SUPER_ADMIN) {
      return this.hierarchicalEventService.getSuperAdminEvents();
    } else if (role === Role.STATE_ADMIN) {
      return this.hierarchicalEventService.getStateAdminEvents(state);
    } else if (role === Role.BRANCH_ADMIN) {
      return this.hierarchicalEventService.getBranchAdminEvents(state, branch);
    }
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
}

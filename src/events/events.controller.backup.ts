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
} from '@nestjs/common';
import { EventsService } from './events.service';
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
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @Roles(Role.ADMIN)
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
  @Roles(Role.ADMIN)
  addBusPickup(
    @Param('id') id: string,
    @Body() busPickupData: BusPickupRequest,
  ) {
    return this.eventsService.addPickupStation(
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
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.eventsService.remove(id);
  }

  @Post(':eventId/concierge-requests')
  @Roles(Role.CONCIERGE)
  async requestConcierge(@Param('eventId') eventId: string, @Request() req) {
    return this.eventsService.requestConcierge(eventId, req.user.userId);
  }

  @Get('concierge-requests/pending')
  @Roles(Role.ADMIN)
  async getAllPendingConciergeRequests() {
    return this.eventsService.getAllPendingConciergeRequests();
  }

  @Post(':eventId/concierge-requests/:requestId/review')
  @Roles(Role.ADMIN)
  async reviewConciergeRequest(
    @Param('eventId') eventId: string,
    @Param('requestId') requestId: string,
    @Body('approve') approve: boolean,
    @Request() req
  ) {
    return this.eventsService.reviewConciergeRequest(eventId, requestId, approve, req.user.userId);
  }

  @Get('concierge-requests/approved')
  @Roles(Role.ADMIN)
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

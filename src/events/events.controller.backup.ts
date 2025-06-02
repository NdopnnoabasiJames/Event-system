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

  @Post(':eventId/Registrar-requests')
  @Roles(Role.REGISTRAR)
  async requestRegistrar(@Param('eventId') eventId: string, @Request() req) {
    return this.eventsService.requestRegistrar(eventId, req.user.userId);
  }
  @Get('Registrar-requests/pending')
  @Roles(Role.SUPER_ADMIN)
  async getAllPendingRegistrarRequests() {
    return this.eventsService.getAllPendingRegistrarRequests();
  }
  @Post(':eventId/Registrar-requests/:requestId/review')
  @Roles(Role.SUPER_ADMIN)
  async reviewRegistrarRequest(
    @Param('eventId') eventId: string,
    @Param('requestId') requestId: string,
    @Body('approve') approve: boolean,
    @Request() req
  ) {
    return this.eventsService.reviewRegistrarRequest(eventId, requestId, approve, req.user.userId);
  }
  @Get('Registrar-requests/approved')
  @Roles(Role.SUPER_ADMIN)
  async getAllApprovedRegistrars() {
    return this.eventsService.getAllApprovedRegistrars();
  }

  @Delete(':eventId/Registrar-requests')
  @Roles(Role.REGISTRAR)
  async cancelRegistrarRequest(@Param('eventId') eventId: string, @Request() req) {
    return this.eventsService.cancelRegistrarRequest(eventId, req.user.userId);
  }

  @Post(':eventId/check-in')
  @Roles(Role.REGISTRAR)
  async checkInAttendee(
    @Param('eventId') eventId: string, 
    @Body('phone') phone: string,
    @Request() req
  ) {
    return this.eventsService.checkInGuest(eventId, phone, req.user.userId);
  }
}

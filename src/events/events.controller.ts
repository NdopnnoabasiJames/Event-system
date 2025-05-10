import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

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
    @Body() busPickupData: { location: string; departureTime: Date },
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
}

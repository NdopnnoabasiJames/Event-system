import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { AttendeesService } from './attendees.service';
import { CreateAttendeeDto } from './dto/create-attendee.dto';
import { UpdateAttendeeDto } from './dto/update-attendee.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('attendees')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendeesController {
  constructor(private readonly attendeesService: AttendeesService) {}
  @Post(':eventId')
  @Roles(Role.MARKETER)
  create(
    @Param('eventId') eventId: string,
    @Body() createAttendeeDto: CreateAttendeeDto,
    @Request() req,
  ) {
    return this.attendeesService.create({
      ...createAttendeeDto,
      event: eventId,
      registeredBy: req.user.userId,
    });
  }

  @Get()
  @Roles(Role.ADMIN, Role.MARKETER, Role.CONCIERGE)
  findAll(@Query('eventId') eventId?: string, @Query('transport') transport?: 'bus' | 'private') {
    if (eventId && transport) {
      return this.attendeesService.getAttendeesByTransport(eventId, transport);
    } else if (eventId) {
      return this.attendeesService.getEventAttendees(eventId);
    }
    return this.attendeesService.findAll();
  }

  @Get('bus-pickups/:location')
  @Roles(Role.ADMIN, Role.MARKETER)
  findByBusPickup(
    @Param('location') location: string,
    @Query('eventId') eventId: string,
  ) {
    return this.attendeesService.getBusAttendeesByPickup(eventId, location);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MARKETER)
  findOne(@Param('id') id: string) {
    return this.attendeesService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.MARKETER)
  update(
    @Param('id') id: string,
    @Body() updateAttendeeDto: UpdateAttendeeDto,
  ) {
    return this.attendeesService.update(id, updateAttendeeDto);
  }

  @Delete(':id')
  @Roles(Role.MARKETER)
  remove(@Param('id') id: string) {
    return this.attendeesService.remove(id);
  }
}

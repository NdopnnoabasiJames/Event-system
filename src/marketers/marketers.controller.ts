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
} from '@nestjs/common';
import { MarketersService } from './marketers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('marketers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.MARKETER)
export class MarketersController {
  constructor(private readonly marketersService: MarketersService) {}

  @Get('events/available')
  getAvailableEvents() {
    return this.marketersService.getAvailableEvents();
  }

  @Get('events/my')
  getMyEvents(@Request() req) {
    return this.marketersService.getMarketerEvents(req.user.userId);
  }

  @Post('events/:eventId/volunteer')
  volunteerForEvent(
    @Param('eventId') eventId: string,
    @Request() req,
  ) {
    return this.marketersService.volunteerForEvent(eventId, req.user.userId);
  }

  @Delete('events/:eventId/leave')
  leaveEvent(
    @Param('eventId') eventId: string,
    @Request() req,
  ) {
    return this.marketersService.leaveEvent(eventId, req.user.userId);
  }

  @Post('events/:eventId/attendees')
  registerAttendee(
    @Param('eventId') eventId: string,
    @Body() attendeeData: any,
    @Request() req,
  ) {
    return this.marketersService.registerAttendee(
      req.user.userId,
      eventId,
      attendeeData,
    );
  }

  @Get('attendees')
  getMyAttendees(@Request() req) {
    return this.marketersService.getMarketerAttendees(req.user.userId);
  }

  @Get('events/:eventId/attendees')
  getEventAttendees(
    @Param('eventId') eventId: string,
    @Request() req,
  ) {
    return this.marketersService.getMarketerAttendees(req.user.userId, eventId);
  }

  @Patch('attendees/:id')
  updateAttendee(
    @Param('id') id: string,
    @Body() updateData: any,
    @Request() req,
  ) {
    return this.marketersService.updateAttendee(req.user.userId, id, updateData);
  }

  @Delete('attendees/:id')
  removeAttendee(
    @Param('id') id: string,
    @Request() req,
  ) {
    return this.marketersService.removeAttendee(req.user.userId, id);
  }
}

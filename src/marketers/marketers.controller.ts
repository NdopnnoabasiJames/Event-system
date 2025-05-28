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
  HttpStatus,
  Query,
  ForbiddenException,
} from '@nestjs/common';

import { MarketersService } from './marketers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CreateEventDto } from '../events/dto/create-event.dto';
import { CreateAttendeeDto } from '../attendees/dto/create-attendee.dto';
import { UpdateAttendeeDto } from '../attendees/dto/update-attendee.dto';

@Controller('marketers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.MARKETER, Role.ADMIN)
export class MarketersController {
  constructor(private readonly marketersService: MarketersService) {}

  @Get('events/available')
  getAvailableEvents() {
    return this.marketersService.getAvailableEvents();
  }

  @Get('events/my')
  async getMyEvents(@Request() req, @Query('marketerId') marketerId?: string) {
    const userId = marketerId || req.user.userId;
    // If marketerId is provided and user is not admin, verify access
    if (marketerId && req.user.role !== Role.ADMIN) {
      if (marketerId !== req.user.userId) {
        throw new ForbiddenException('Cannot access another marketer\'s events');
      }
    }
    console.log(`Fetching events for marketer: ${userId}`);
    const events = await this.marketersService.getMarketerEvents(userId);
    console.log(`Found ${events.length} events for marketer ${userId}`);
    return events;
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
    @Body() attendeeData: CreateAttendeeDto,
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
    @Body() updateData: UpdateAttendeeDto,
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

  @Get('analytics/performance')
  getMyPerformance(@Request() req, @Query('marketerId') marketerId?: string) {
    const userId = marketerId || req.user.userId;
    // If marketerId is provided and user is not admin, verify access
    if (marketerId && req.user.role !== Role.ADMIN) {
      if (marketerId !== req.user.userId) {
        throw new ForbiddenException('Cannot access another marketer\'s performance stats');
      }
    }
    return this.marketersService.getMarketerPerformanceStats(userId);
  }

  @Get('analytics/event/:eventId')
  getEventPerformance(
    @Param('eventId') eventId: string,
    @Request() req,
    @Query('marketerId') marketerId?: string,
  ) {
    const userId = marketerId || req.user.userId;
    // If marketerId is provided and user is not admin, verify access
    if (marketerId && req.user.role !== Role.ADMIN) {
      if (marketerId !== req.user.userId) {
        throw new ForbiddenException('Cannot access another marketer\'s event performance stats');
      }
    }
    return this.marketersService.getMarketerEventPerformance(userId, eventId);
  }

  @Get('analytics/top')
  @Roles(Role.ADMIN)
  getTopMarketers() {
    return this.marketersService.getTopPerformingMarketers(10);
  }
}

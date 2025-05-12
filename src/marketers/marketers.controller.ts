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
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery 
} from '@nestjs/swagger';
import { MarketersService } from './marketers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CreateEventDto } from '../events/dto/create-event.dto';
import { CreateAttendeeDto } from '../attendees/dto/create-attendee.dto';
import { UpdateAttendeeDto } from '../attendees/dto/update-attendee.dto';

@ApiTags('marketers')
@ApiBearerAuth()
@Controller('marketers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.MARKETER)
export class MarketersController {
  constructor(private readonly marketersService: MarketersService) {}

  @Get('events/available')
  @ApiOperation({ summary: 'Get available events for marketers to volunteer' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of available events',
    type: [CreateEventDto]
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - Marketer access required' })
  getAvailableEvents() {
    return this.marketersService.getAvailableEvents();
  }

  @Get('events/my')
  @ApiOperation({ summary: 'Get events where the marketer is volunteering' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of events where marketer is participating',
    type: [CreateEventDto]
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - Marketer access required' })
  getMyEvents(@Request() req) {
    return this.marketersService.getMarketerEvents(req.user.userId);
  }

  @Post('events/:eventId/volunteer')
  @ApiOperation({ summary: 'Volunteer for an event as a marketer' })
  @ApiParam({
    name: 'eventId',
    description: 'The ID of the event to volunteer for',
    example: '645f3c7e8d6e5a7b1c9d2e3f'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully volunteered for the event',
    type: CreateEventDto
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - Marketer access required' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Event not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Already volunteering for this event' })
  volunteerForEvent(
    @Param('eventId') eventId: string,
    @Request() req,
  ) {
    return this.marketersService.volunteerForEvent(eventId, req.user.userId);
  }

  @Delete('events/:eventId/leave')
  @ApiOperation({ summary: 'Leave an event as a marketer' })
  @ApiParam({
    name: 'eventId',
    description: 'The ID of the event to leave',
    example: '645f3c7e8d6e5a7b1c9d2e3f'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully left the event',
    type: CreateEventDto
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - Marketer access required' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Event not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Not volunteering for this event' })
  leaveEvent(
    @Param('eventId') eventId: string,
    @Request() req,
  ) {
    return this.marketersService.leaveEvent(eventId, req.user.userId);
  }

  @Post('events/:eventId/attendees')
  @ApiOperation({ summary: 'Register a new attendee for an event' })
  @ApiParam({
    name: 'eventId',
    description: 'The ID of the event to register an attendee for',
    example: '645f3c7e8d6e5a7b1c9d2e3f'
  })
  @ApiBody({ 
    type: CreateAttendeeDto,
    description: 'Attendee registration data',
    examples: {
      example1: {
        value: {
          name: "Jane Smith",
          email: "jane.smith@example.com",
          phone: "+1234567890",
          transportPreference: "bus",
          busPickup: {
            location: "Central Station",
            departureTime: "2025-07-15T07:00:00Z"
          }
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Attendee successfully registered',
    type: CreateAttendeeDto
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - Marketer access required or not assigned to event' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Event not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data' })
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
  @ApiOperation({ summary: 'Get all attendees registered by the marketer' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of attendees registered by the marketer',
    type: [CreateAttendeeDto]
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - Marketer access required' })
  getMyAttendees(@Request() req) {
    return this.marketersService.getMarketerAttendees(req.user.userId);
  }

  @Get('events/:eventId/attendees')
  @ApiOperation({ summary: 'Get attendees registered by the marketer for a specific event' })
  @ApiParam({
    name: 'eventId',
    description: 'The ID of the event to get attendees for',
    example: '645f3c7e8d6e5a7b1c9d2e3f'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of attendees for the specified event',
    type: [CreateAttendeeDto]
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - Marketer access required' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Event not found' })
  getEventAttendees(
    @Param('eventId') eventId: string,
    @Request() req,
  ) {
    return this.marketersService.getMarketerAttendees(req.user.userId, eventId);
  }

  @Patch('attendees/:id')
  @ApiOperation({ summary: 'Update attendee information' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the attendee to update',
    example: '645f3c7e8d6e5a7b1c9d2e3f'
  })
  @ApiBody({ 
    type: UpdateAttendeeDto,
    description: 'Attendee update data',
    examples: {
      example1: {
        value: {
          phone: "+1987654321",
          transportPreference: "private"
        }
      },
      example2: {
        value: {
          transportPreference: "bus",
          busPickup: {
            location: "North Station",
            departureTime: "2025-07-15T08:00:00Z"
          }
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Attendee information successfully updated',
    type: CreateAttendeeDto
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - Can only update own registrations' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Attendee not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data' })
  updateAttendee(
    @Param('id') id: string,
    @Body() updateData: UpdateAttendeeDto,
    @Request() req,
  ) {
    return this.marketersService.updateAttendee(req.user.userId, id, updateData);
  }

  @Delete('attendees/:id')
  @ApiOperation({ summary: 'Remove an attendee registration' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the attendee to remove',
    example: '645f3c7e8d6e5a7b1c9d2e3f'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Attendee successfully removed'
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - Can only remove own registrations' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Attendee not found' })
  removeAttendee(
    @Param('id') id: string,
    @Request() req,
  ) {
    return this.marketersService.removeAttendee(req.user.userId, id);
  }

  @Get('analytics/performance')
  @ApiOperation({ summary: 'Get performance statistics for the current marketer' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Performance statistics for the marketer',
    schema: {
      type: 'object',
      properties: {
        totalAttendeesRegistered: { type: 'number' },
        attendeesPerEvent: { type: 'object' },
        eventsParticipated: { type: 'number' },
        averageAttendeesPerEvent: { type: 'number' }
      }
    }
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - Marketer access required' })
  getMyPerformance(@Request() req) {
    return this.marketersService.getMarketerPerformanceStats(req.user.userId);
  }

  @Get('analytics/event/:eventId')
  @ApiOperation({ summary: 'Get marketer performance for specific event' })
  @ApiParam({
    name: 'eventId',
    description: 'The ID of the event to check performance for',
    example: '645f3c7e8d6e5a7b1c9d2e3f'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Event performance statistics'
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - Marketer access required' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Event not found' })
  getEventPerformance(
    @Param('eventId') eventId: string,
    @Request() req,
  ) {
    return this.marketersService.getMarketerEventPerformance(req.user.userId, eventId);
  }

  @Get('analytics/top')
  @ApiOperation({ summary: 'Get top performing marketers' })
  @Roles(Role.ADMIN)
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of top performing marketers'
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - Admin access required' })
  getTopMarketers() {
    return this.marketersService.getTopPerformingMarketers(10);
  }
}

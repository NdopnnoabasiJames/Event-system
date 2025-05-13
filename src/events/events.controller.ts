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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiProperty,
} from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { EventDocument } from '../schemas/event.schema';

class BusPickupRequest {
  @ApiProperty({
    example: 'Central Station',
    description: 'The pickup location name',
  })
  location: string;

  @ApiProperty({
    example: '2025-07-15T09:00:00Z',
    description: 'The departure time for the bus pickup',
  })
  departureTime: string;
}

@ApiTags('events')
@ApiBearerAuth()
@Controller('events')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new event (Admin only)' })
  @ApiBody({
    type: CreateEventDto,
    description: 'Event creation data',
    examples: {
      example1: {
        value: {
          name: 'Summer Tech Conference 2025',
          date: '2025-07-15T09:00:00Z',
          state: 'California',
          maxAttendees: 500,
          branches: [
            {
              name: 'Downtown Branch',
              location: '123 Main St',
              manager: 'John Smith',
              contact: '+1234567890',
            },
          ],
          busPickups: [
            {
              location: 'Central Station',
              departureTime: '2025-07-15T07:00:00Z',
              maxCapacity: 50,
              currentCount: 0,
            },
          ],
          isActive: true,
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Event successfully created',
    type: CreateEventDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  create(@Body() createEventDto: CreateEventDto) {
    return this.eventsService.create(createEventDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all events' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of all events',
    type: [CreateEventDto],
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  findAll() {
    return this.eventsService.findAll();
  }

  @Get('active')
  @ApiOperation({ summary: 'Get all active events' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of active events',
    type: [CreateEventDto],
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  getActiveEvents() {
    return this.eventsService.getActiveEvents();
  }

  @Get('state/:state')
  @ApiOperation({ summary: 'Get events by state' })
  @ApiParam({
    name: 'state',
    description: 'The state name to filter events by',
    example: 'California',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of events in the specified state',
    type: [CreateEventDto],
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No events found in the specified state',
  })
  getEventsByState(@Param('state') state: string) {
    return this.eventsService.getEventsByState(state);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get event by ID' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the event to retrieve',
    example: '645f3c7e8d6e5a7b1c9d2e3f',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The event details',
    type: CreateEventDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Event not found' })
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Post(':id/bus-pickup')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Add a bus pickup location to an event (Admin only)',
  })
  @ApiParam({
    name: 'id',
    description: 'The ID of the event to add a bus pickup to',
    example: '645f3c7e8d6e5a7b1c9d2e3f',
  })
  @ApiBody({
    type: BusPickupRequest,
    description: 'Bus pickup details',
    examples: {
      example1: {
        value: {
          location: 'Central Station',
          departureTime: '2025-07-15T07:00:00Z',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bus pickup successfully added',
    type: CreateEventDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Event not found' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
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
  @ApiOperation({ summary: 'Join an event as a marketer' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the event to join',
    example: '645f3c7e8d6e5a7b1c9d2e3f',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully joined the event',
    type: CreateEventDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Marketer access required',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Event not found' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Already joined this event',
  })
  joinEvent(@Param('id') id: string, @Request() req) {
    return this.eventsService.addMarketerToEvent(id, req.user.userId);
  }

  @Delete(':id/leave')
  @Roles(Role.MARKETER)
  @ApiOperation({ summary: 'Leave an event as a marketer' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the event to leave',
    example: '645f3c7e8d6e5a7b1c9d2e3f',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully left the event',
    type: CreateEventDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Marketer access required',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Event not found' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Not a participant in this event',
  })
  leaveEvent(@Param('id') id: string, @Request() req) {
    return this.eventsService.removeMarketerFromEvent(id, req.user.userId);
  }
}

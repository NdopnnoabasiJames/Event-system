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

import { WorkersService } from './workers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CreateEventDto } from '../events/dto/create-event.dto';
import { CreateGuestDto } from '../guests/dto/create-guest.dto';
import { UpdateGuestDto } from '../guests/dto/update-guest.dto';

@Controller('workers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.WORKER, Role.SUPER_ADMIN)
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}
  @Get('events/available')
  getAvailableEvents() {
    return this.workersService.getAvailableEvents();
  }

  @Get('events/my')
  async getMyEvents(@Request() req, @Query('workerId') workerId?: string) {
    const userId = workerId || req.user.userId;
    // If workerId is provided and user is not admin, verify access
    if (workerId && req.user.role !== Role.SUPER_ADMIN) {
      if (workerId !== req.user.userId) {
        throw new ForbiddenException('Cannot access another worker\'s events');
      }
    }
    console.log(`Fetching events for worker: ${userId}`);
    const events = await this.workersService.getWorkerEvents(userId);
    console.log(`Found ${events.length} events for worker ${userId}`);
    return events;
  }
  @Post('events/:eventId/volunteer')
  volunteerForEvent(
    @Param('eventId') eventId: string,
    @Request() req,
  ) {
    return this.workersService.volunteerForEvent(eventId, req.user.userId);
  }

  @Delete('events/:eventId/leave')
  leaveEvent(
    @Param('eventId') eventId: string,
    @Request() req,
  ) {
    return this.workersService.leaveEvent(eventId, req.user.userId);
  }

  @Post('events/:eventId/guests')
  registerGuest(
    @Param('eventId') eventId: string,
    @Body() guestData: CreateGuestDto,
    @Request() req,
  ) {
    return this.workersService.registerGuest(
      req.user.userId,
      eventId,
      guestData,
    );
  }

  @Get('guests')
  getMyGuests(@Request() req) {
    return this.workersService.getWorkerGuests(req.user.userId);
  }

  @Get('events/:eventId/guests')
  getEventGuests(
    @Param('eventId') eventId: string,
    @Request() req,
  ) {
    return this.workersService.getWorkerGuests(req.user.userId, eventId);
  }

  @Patch('guests/:id')
  updateGuest(
    @Param('id') id: string,
    @Body() updateData: UpdateGuestDto,
    @Request() req,
  ) {
    return this.workersService.updateGuest(req.user.userId, id, updateData);
  }

  @Delete('guests/:id')
  removeGuest(
    @Param('id') id: string,
    @Request() req,
  ) {
    return this.workersService.removeGuest(req.user.userId, id);
  }
  @Get('analytics/performance')
  getMyPerformance(@Request() req, @Query('workerId') workerId?: string) {
    const userId = workerId || req.user.userId;
    // If workerId is provided and user is not admin, verify access
    if (workerId && req.user.role !== Role.SUPER_ADMIN) {
      if (workerId !== req.user.userId) {
        throw new ForbiddenException('Cannot access another worker\'s performance stats');
      }
    }
    return this.workersService.getWorkerPerformanceStats(userId);
  }

  @Get('analytics/event/:eventId')
  getEventPerformance(
    @Param('eventId') eventId: string,
    @Request() req,
    @Query('workerId') workerId?: string,
  ) {
    const userId = workerId || req.user.userId;
    // If workerId is provided and user is not admin, verify access
    if (workerId && req.user.role !== Role.SUPER_ADMIN) {
      if (workerId !== req.user.userId) {
        throw new ForbiddenException('Cannot access another worker\'s event performance stats');
      }
    }
    return this.workersService.getWorkerEventPerformance(userId, eventId);
  }

  @Get('analytics/top')
  @Roles(Role.SUPER_ADMIN)
  getTopWorkers() {
    return this.workersService.getTopPerformingWorkers(10);
  }
}

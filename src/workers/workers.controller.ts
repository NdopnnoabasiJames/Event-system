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
  Logger,
  HttpException,
} from '@nestjs/common';

import { WorkersService } from './workers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CreateEventDto } from '../events/dto/create-event.dto';
import { CreateGuestDto } from '../guests/dto/create-guest.dto';
import { UpdateGuestDto } from '../guests/dto/update-guest.dto';
import { QuickGuestRegistrationDto } from '../guests/dto/quick-guest-registration.dto';
import { RegisterDto } from '../auth/dto/register.dto';

@Controller('workers')
export class WorkersController {
  private readonly logger = new Logger(WorkersController.name);

  constructor(private readonly workersService: WorkersService) {}
  // Worker Registration - Public endpoint (no authentication required)
  @Post('register')
  async registerWorker(@Body() registerData: RegisterDto) {
    return this.workersService.registerWorker(registerData);
  }
  // Get worker profile
  @Get('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.WORKER)
  async getWorkerProfile(@Request() req) {
    return this.workersService.getWorkerProfile(req.user.userId);
  }
  // Update worker profile
  @Patch('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.WORKER)
  async updateWorkerProfile(@Request() req, @Body() updateData: any) {
    return this.workersService.updateWorkerProfile(req.user.userId, updateData);
  }

  // Branch Admin endpoints for worker management
  @Get('pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BRANCH_ADMIN)
  async getPendingWorkers(@Request() req) {
    this.logger.log(`GET /workers/pending - Branch Admin: ${req.user?.email}`);
    
    try {
      const pendingWorkers = await this.workersService.getPendingWorkers(req.user);
      this.logger.log(`Found ${pendingWorkers.length} pending workers`);
      return pendingWorkers;
    } catch (error) {
      this.logger.error(`Error fetching pending workers: ${error.message}`);
      throw new HttpException('Failed to fetch pending workers', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  @Get('approved')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BRANCH_ADMIN)
  async getApprovedWorkers(@Request() req) {
    this.logger.log(`GET /workers/approved - Branch Admin: ${req.user?.email}`);
    
    try {
      const approvedWorkers = await this.workersService.getApprovedWorkers(req.user);
      this.logger.log(`Found ${approvedWorkers.length} approved workers`);
      return approvedWorkers;
    } catch (error) {
      this.logger.error(`Error fetching approved workers: ${error.message}`);
      throw new HttpException('Failed to fetch approved workers', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  @Post('approve/:workerId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BRANCH_ADMIN)
  async approveWorker(@Param('workerId') workerId: string, @Request() req) {
    this.logger.log(`Approving worker ${workerId} by ${req.user?.email}`);
    
    try {
      const result = await this.workersService.approveWorker(workerId, req.user);
      this.logger.log(`Worker ${workerId} approved successfully`);
      return result;
    } catch (error) {
      this.logger.error(`Error approving worker ${workerId}: ${error.message}`);
      throw new HttpException(error.message || 'Failed to approve worker', HttpStatus.BAD_REQUEST);
    }
  }
  @Delete('reject/:workerId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BRANCH_ADMIN)
  async rejectWorker(@Param('workerId') workerId: string, @Request() req) {
    this.logger.log(`Rejecting worker ${workerId} by ${req.user?.email}`);
    
    try {
      const result = await this.workersService.rejectWorker(workerId, req.user);
      this.logger.log(`Worker ${workerId} rejected successfully`);
      return result;
    } catch (error) {
      this.logger.error(`Error rejecting worker ${workerId}: ${error.message}`);
      throw new HttpException(error.message || 'Failed to reject worker', HttpStatus.BAD_REQUEST);
    }
  }
  @Get('events/available')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.WORKER, Role.SUPER_ADMIN)
  getAvailableEvents(@Request() req) {
    return this.workersService.getAvailableEvents(req.user.userId);
  }

  @Get('events/my')
  @UseGuards(JwtAuthGuard, RolesGuard)
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
    console.log(`Found ${events.length} events for worker ${userId}`);    return events;
  }

  @Post('events/:eventId/volunteer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.WORKER)
  volunteerForEvent(
    @Param('eventId') eventId: string,
    @Request() req,
  ) {
    return this.workersService.volunteerForEvent(eventId, req.user.userId);
  }
  @Delete('events/:eventId/leave')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.WORKER)
  leaveEvent(
    @Param('eventId') eventId: string,
    @Request() req,
  ) {
    return this.workersService.leaveEvent(eventId, req.user.userId);
  }
  // Phase 2.3: Quick Guest Registration (30-second target)
  @Post('events/:eventId/guests/quick')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.WORKER)
  quickRegisterGuest(
    @Param('eventId') eventId: string,
    @Body() quickGuestData: QuickGuestRegistrationDto,
    @Request() req,
  ) {
    return this.workersService.quickRegisterGuest(
      req.user.userId,
      eventId,
      quickGuestData,
    );
  }

  @Post('events/:eventId/guests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.WORKER)
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
  // Phase 2.4: Enhanced Worker's Guest Management
  @Get('guests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.WORKER)
  getMyGuestsWithFilters(
    @Request() req,
    @Query('eventId') eventId?: string,
    @Query('transportPreference') transportPreference?: 'bus' | 'private',
    @Query('checkedIn') checkedIn?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: 'name' | 'registeredAt' | 'checkedInTime',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const filters = {
      eventId,
      transportPreference,
      checkedIn: checkedIn === 'true' ? true : checkedIn === 'false' ? false : undefined,
      search,
      sortBy,
      sortOrder,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    };
    
    return this.workersService.getWorkerGuestsWithFilters(req.user.userId, filters);
  }
  @Patch('guests/bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.WORKER)
  bulkUpdateGuests(
    @Body() bulkUpdateData: { guestIds: string[]; updateData: any },
    @Request() req,
  ) {
    return this.workersService.bulkUpdateGuests(
      req.user.userId,
      bulkUpdateData.guestIds,
      bulkUpdateData.updateData
    );
  }

  @Get('guests/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.WORKER)
  getGuestRegistrationStats(
    @Request() req,
    @Query('eventId') eventId?: string,
  ) {
    return this.workersService.getGuestRegistrationStats(req.user.userId, eventId);
  }

  @Get('events/:eventId/guests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.WORKER)
  getEventGuests(
    @Param('eventId') eventId: string,
    @Request() req,
  ) {
    return this.workersService.getWorkerGuests(req.user.userId, eventId);
  }

  @Patch('guests/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  updateGuest(
    @Param('id') id: string,
    @Body() updateData: UpdateGuestDto,
    @Request() req,
  ) {
    return this.workersService.updateGuest(req.user.userId, id, updateData);
  }

  @Delete('guests/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  removeGuest(
    @Param('id') id: string,
    @Request() req,
  ) {
    return this.workersService.removeGuest(req.user.userId, id);
  }  @Get('analytics/performance')
  @UseGuards(JwtAuthGuard, RolesGuard)
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
  @UseGuards(JwtAuthGuard, RolesGuard)
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  getTopWorkers() {
    return this.workersService.getTopPerformingWorkers(10);
  }
}

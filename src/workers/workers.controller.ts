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
import { WorkerVolunteerService } from './services/worker-volunteer.service';
import { VolunteerApprovalService } from './services/volunteer-approval.service';
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

  constructor(
    private readonly workersService: WorkersService,
    private readonly workerVolunteerService: WorkerVolunteerService,
    private readonly volunteerApprovalService: VolunteerApprovalService,
  ) {}
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
  }  // Get all published events for workers to volunteer for
  @Get('events/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.WORKER, Role.SUPER_ADMIN)
  async getAvailableEvents(@Request() req) {
    const events = await this.workerVolunteerService.getPublishedEvents();
    
    // For each event, get the worker's volunteer status
    const eventsWithStatus = await Promise.all(
      events.map(async (event) => {
        const status = await this.workerVolunteerService.getVolunteerStatus(
          event._id.toString(), 
          req.user.userId
        );
        return {
          ...event.toObject(),
          volunteerStatus: status.status
        };
      })
    );
    
    return eventsWithStatus;
  }
  // Get events where worker has been approved
  @Get('events/my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.WORKER)
  async getMyEvents(@Request() req) {
    return this.workerVolunteerService.getWorkerApprovedEvents(req.user.userId);
  }

  // Volunteer for an event
  @Post('events/:eventId/volunteer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.WORKER)
  async volunteerForEvent(
    @Param('eventId') eventId: string,
    @Request() req,
  ) {
    return this.workerVolunteerService.volunteerForEvent(eventId, req.user.userId);
  }

  // Get volunteer status for an event
  @Get('events/:eventId/volunteer-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.WORKER)
  async getVolunteerStatus(
    @Param('eventId') eventId: string,
    @Request() req,
  ) {
    return this.workerVolunteerService.getVolunteerStatus(eventId, req.user.userId);
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
    );  }

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
    return this.workersService.getWorkerGuestsWithFilters(req.user.userId, { eventId });
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

  // Worker statistics endpoint
  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.WORKER)
  async getWorkerStats(@Request() req) {
    this.logger.log(`GET /workers/stats - Worker: ${req.user?.email}`);
    
    try {
      const stats = await this.workersService.getWorkerStats(req.user.userId);
      return stats;
    } catch (error) {
      this.logger.error(`Error fetching worker stats: ${error.message}`);
      throw new HttpException('Failed to fetch worker statistics', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Get worker's registered guests
  @Get('guests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.WORKER)
  async getWorkerGuests(@Request() req) {
    this.logger.log(`GET /workers/guests - Worker: ${req.user?.email}`);
    
    try {
      const guests = await this.workersService.getWorkerGuests(req.user.userId);
      return guests;
    } catch (error) {
      this.logger.error(`Error fetching worker guests: ${error.message}`);
      throw new HttpException('Failed to fetch worker guests', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Register guest for event
  @Post('events/register-guest')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.WORKER)
  async registerGuestForEvent(@Request() req, @Body() guestData: any) {
    this.logger.log(`POST /workers/events/register-guest - Worker: ${req.user?.email}`);
    
    try {
      const result = await this.workersService.registerGuestForEvent(guestData, req.user.userId);
      this.logger.log(`Guest registered successfully by worker ${req.user?.email}`);
      return result;
    } catch (error) {
      this.logger.error(`Error registering guest: ${error.message}`);
      throw new HttpException(error.message || 'Failed to register guest', HttpStatus.BAD_REQUEST);
    }
  }

  // ========== BRANCH ADMIN VOLUNTEER MANAGEMENT ENDPOINTS ==========
  
  // Get pending volunteer requests for branch admin
  @Get('admin/volunteer-requests/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BRANCH_ADMIN, Role.SUPER_ADMIN)
  async getPendingVolunteerRequests(@Request() req) {
    this.logger.log(`GET /workers/admin/volunteer-requests/pending - Admin: ${req.user?.email}`);
    
    try {
      const requests = await this.volunteerApprovalService.getPendingVolunteerRequests(req.user.userId);
      return requests;
    } catch (error) {
      this.logger.error(`Error fetching pending volunteer requests: ${error.message}`);
      throw new HttpException(error.message || 'Failed to fetch pending requests', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Approve or reject volunteer request
  @Post('admin/volunteer-requests/:eventId/:requestId/:action')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BRANCH_ADMIN, Role.SUPER_ADMIN)
  async reviewVolunteerRequest(
    @Param('eventId') eventId: string,
    @Param('requestId') requestId: string,
    @Param('action') action: 'approve' | 'reject',
    @Request() req
  ) {
    this.logger.log(`POST /workers/admin/volunteer-requests/${eventId}/${requestId}/${action} - Admin: ${req.user?.email}`);
    
    try {
      const result = await this.volunteerApprovalService.reviewVolunteerRequest(
        eventId, 
        requestId, 
        req.user.userId, 
        action
      );
      this.logger.log(`Volunteer request ${action}ed successfully by admin ${req.user?.email}`);
      return result;
    } catch (error) {
      this.logger.error(`Error reviewing volunteer request: ${error.message}`);
      throw new HttpException(error.message || 'Failed to review volunteer request', HttpStatus.BAD_REQUEST);
    }
  }

  // Get volunteer request statistics for branch admin
  @Get('admin/volunteer-requests/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BRANCH_ADMIN, Role.SUPER_ADMIN)
  async getVolunteerRequestStats(@Request() req) {
    this.logger.log(`GET /workers/admin/volunteer-requests/stats - Admin: ${req.user?.email}`);
    
    try {
      const stats = await this.volunteerApprovalService.getVolunteerRequestStats(req.user.userId);
      return stats;
    } catch (error) {
      this.logger.error(`Error fetching volunteer request stats: ${error.message}`);
      throw new HttpException(error.message || 'Failed to fetch volunteer stats', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Get approved event workers for branch admin
  @Get('admin/approved-event-workers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BRANCH_ADMIN, Role.SUPER_ADMIN)
  async getApprovedEventWorkers(@Request() req) {
    this.logger.log(`GET /workers/admin/approved-event-workers - Admin: ${req.user?.email}`);
    
    try {
      const eventWorkers = await this.volunteerApprovalService.getApprovedEventWorkers(req.user.userId);
      return eventWorkers;
    } catch (error) {
      this.logger.error(`Error fetching approved event workers: ${error.message}`);
      throw new HttpException(error.message || 'Failed to fetch approved event workers', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

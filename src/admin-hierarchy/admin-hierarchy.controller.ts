import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { AdminHierarchyService } from '../admin-hierarchy/admin-hierarchy.service';
import { HierarchicalEventCreationService, CreateHierarchicalEventDto } from '../events/hierarchical-event-creation.service';

@Controller('admin-hierarchy')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminHierarchyController {
  constructor(
    private adminHierarchyService: AdminHierarchyService,
    private hierarchicalEventService: HierarchicalEventCreationService,
  ) {}

  @Get('profile')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN)
  async getAdminProfile(@Request() req) {
    try {
      return await this.adminHierarchyService.getAdminWithHierarchy(req.user.userId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('accessible-states')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN)
  async getAccessibleStates(@Request() req) {
    try {
      return await this.adminHierarchyService.getAccessibleStates(req.user.userId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('accessible-branches/:stateId?')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN)
  async getAccessibleBranches(@Request() req, @Param('stateId') stateId?: string) {
    try {
      return await this.adminHierarchyService.getAccessibleBranches(req.user.userId, stateId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('events')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN)
  async getEventsForAdmin(@Request() req) {
    try {
      return await this.adminHierarchyService.getEventsForAdmin(req.user.userId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('events/super-admin')
  @Roles(Role.SUPER_ADMIN)
  async createSuperAdminEvent(@Body() createEventDto: CreateHierarchicalEventDto, @Request() req) {
    try {
      return await this.hierarchicalEventService.createSuperAdminEvent(createEventDto, req.user.userId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('events/state-admin')
  @Roles(Role.STATE_ADMIN)
  async createStateAdminEvent(@Body() createEventDto: CreateHierarchicalEventDto, @Request() req) {
    try {
      return await this.hierarchicalEventService.createStateAdminEvent(createEventDto, req.user.userId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('events/branch-admin')
  @Roles(Role.BRANCH_ADMIN)
  async createBranchAdminEvent(@Body() createEventDto: CreateHierarchicalEventDto, @Request() req) {
    try {
      return await this.hierarchicalEventService.createBranchAdminEvent(createEventDto, req.user.userId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('events/needing-branch-selection')
  @Roles(Role.STATE_ADMIN)
  async getEventsNeedingBranchSelection(@Request() req) {
    try {
      return await this.hierarchicalEventService.getEventsNeedingBranchSelection(req.user.userId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Patch('events/:eventId/select-branches')
  @Roles(Role.STATE_ADMIN)
  async selectBranchesForEvent(
    @Param('eventId') eventId: string,
    @Body() body: { selectedBranches: string[] },
    @Request() req
  ) {
    try {
      return await this.hierarchicalEventService.selectBranchesForEvent(
        eventId,
        body.selectedBranches,
        req.user.userId
      );
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

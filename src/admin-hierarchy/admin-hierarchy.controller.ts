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
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { AdminHierarchyService } from '../admin-hierarchy/admin-hierarchy.service';
import { HierarchicalEventCreationService } from '../events/hierarchical-event-creation.service';
import { CreateHierarchicalEventDto } from '../events/dto/create-hierarchical-event.dto';
import { HierarchicalEventSelectionService } from '../events/services/hierarchical-event-selection.service';
import { 
  AdminReplacementDto, 
  JurisdictionTransferDto 
} from './dto/admin-jurisdiction.dto';

@Controller('admin-hierarchy')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminHierarchyController {  constructor(
    private adminHierarchyService: AdminHierarchyService,
    private hierarchicalEventService: HierarchicalEventCreationService,
    private hierarchicalEventSelectionService: HierarchicalEventSelectionService,
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

  // Phase 2.1: Admin disable/enable functionality
  @Post('disable-admin/:adminId')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN)
  async disableAdmin(
    @Param('adminId') adminId: string,
    @Body() body: { reason?: string },
    @Request() req
  ) {
    try {
      return await this.adminHierarchyService.disableAdmin(adminId, req.user.userId, body.reason);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('enable-admin/:adminId')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN)
  async enableAdmin(@Param('adminId') adminId: string, @Request() req) {
    try {
      return await this.adminHierarchyService.enableAdmin(adminId, req.user.userId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // Phase 2.1: Performance rating calculation for marketers
  @Get('marketer-performance/:marketerId')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN)
  async getMarketerPerformanceRating(@Param('marketerId') marketerId: string) {
    try {
      return await this.adminHierarchyService.calculateMarketerPerformanceRating(marketerId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('marketers-performance-summary')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN)
  async getMarketersPerformanceSummary(@Request() req) {
    try {
      return await this.adminHierarchyService.getMarketersPerformanceSummary(req.user.userId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // Phase 2.1: Enhanced jurisdiction-based access control
  @Get('disabled-admins')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN)
  async getDisabledAdmins(@Request() req) {
    try {
      return await this.adminHierarchyService.getDisabledAdmins(req.user.userId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // Phase 3.1: Enhanced multi-selection endpoints for events
  @Get('events/:eventId/available-options')
  @Roles(Role.STATE_ADMIN, Role.BRANCH_ADMIN)
  async getAvailableOptionsForSelection(
    @Param('eventId') eventId: string,
    @Request() req
  ) {
    try {
      return await this.hierarchicalEventSelectionService.getAvailableOptionsForSelection(
        req.user.userId,
        eventId
      );
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Patch('events/:eventId/select-branches-enhanced')
  @Roles(Role.STATE_ADMIN)
  async selectBranchesForEventEnhanced(
    @Param('eventId') eventId: string,
    @Body() body: { 
      selectedBranches: string[]; 
      options?: { validateLimits?: boolean; replacePrevious?: boolean; dryRun?: boolean; }
    },
    @Request() req
  ) {
    try {
      return await this.hierarchicalEventSelectionService.selectBranchesForEventEnhanced(
        eventId,
        body.selectedBranches,
        req.user.userId,
        body.options
      );
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Patch('events/:eventId/select-zones-enhanced')
  @Roles(Role.BRANCH_ADMIN)
  async selectZonesForEventEnhanced(
    @Param('eventId') eventId: string,
    @Body() body: { 
      selectedZones: string[]; 
      options?: { validateLimits?: boolean; replacePrevious?: boolean; dryRun?: boolean; }
    },
    @Request() req
  ) {
    try {
      return await this.hierarchicalEventSelectionService.selectZonesForEventEnhanced(
        eventId,
        body.selectedZones,
        req.user.userId,
        body.options
      );
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // Phase 3.1: Excel export endpoints (placeholders for Phase 6)
  @Get('export/states')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN)
  async exportStates(@Request() req, @Res() res: Response) {
    try {
      // This will be implemented when we create the Excel export service in Phase 6
      return res.json({ 
        message: 'Excel export for states - To be implemented in Phase 6',
        adminId: req.user.userId 
      });
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('export/branches')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN)
  async exportBranches(@Request() req, @Res() res: Response) {
    try {
      // This will be implemented when we create the Excel export service in Phase 6
      return res.json({ 
        message: 'Excel export for branches - To be implemented in Phase 6',
        adminId: req.user.userId 
      });
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('export/zones')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN)
  async exportZones(@Request() req, @Res() res: Response) {
    try {
      // This will be implemented when we create the Excel export service in Phase 6
      return res.json({ 
        message: 'Excel export for zones - To be implemented in Phase 6',
        adminId: req.user.userId 
      });
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('export/events')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN)
  async exportEvents(@Request() req, @Res() res: Response) {
    try {
      // This will be implemented when we create the Excel export service in Phase 6
      return res.json({ 
        message: 'Excel export for events - To be implemented in Phase 6',
        adminId: req.user.userId 
      });
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('export/admins')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN)
  async exportAdmins(@Request() req, @Res() res: Response) {
    try {
      // This will be implemented when we create the Excel export service in Phase 6
      return res.json({ 
        message: 'Excel export for admins - To be implemented in Phase 6',
        adminId: req.user.userId 
      });
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // Phase 5.3: Admin Replacement and Jurisdiction Transfer endpoints
  @Post('replace-admin')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN)
  async replaceAdmin(
    @Body() replacementDto: AdminReplacementDto,
    @Request() req
  ) {
    try {
      return await this.adminHierarchyService.replaceAdmin(replacementDto, req.user.userId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('transfer-jurisdiction')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN)
  async transferJurisdiction(
    @Body() transferDto: JurisdictionTransferDto,
    @Request() req
  ) {
    try {
      return await this.adminHierarchyService.transferJurisdiction(transferDto, req.user.userId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}

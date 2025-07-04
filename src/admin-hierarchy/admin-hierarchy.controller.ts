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
import { JurisdictionGuard } from '../auth/guards/jurisdiction.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequireJurisdiction } from '../common/decorators/jurisdiction.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Role } from '../common/enums/role.enum';
import { Permission } from '../common/enums/permission.enum';
import { AdminHierarchyService } from '../admin-hierarchy/admin-hierarchy.service';
import { HierarchicalEventCreationService } from '../events/hierarchical-event-creation.service';
import { ExcelExportService } from '../common/services/excel-export.service';
import { CreateHierarchicalEventDto } from '../events/dto/create-hierarchical-event.dto';
import { HierarchicalEventSelectionService } from '../events/services/hierarchical-event-selection.service';
import { 
  AdminReplacementDto, 
  JurisdictionTransferDto 
} from './dto/admin-jurisdiction.dto';
import { ScoreUpdateService } from './services/score-update.service';

@Controller('admin-hierarchy')
@UseGuards(JwtAuthGuard, RolesGuard, JurisdictionGuard, PermissionsGuard)
export class AdminHierarchyController {  constructor(
    private adminHierarchyService: AdminHierarchyService,
    private hierarchicalEventService: HierarchicalEventCreationService,
    private hierarchicalEventSelectionService: HierarchicalEventSelectionService,
    private excelExportService: ExcelExportService,
    private scoreUpdateService: ScoreUpdateService,
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
  }  @Get('accessible-branches/:stateId?')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN)
  @RequireJurisdiction('state')
  @RequirePermissions(Permission.READ_BRANCH)
  async getAccessibleBranches(@Request() req, @Param('stateId') stateId?: string) {
    try {
      return await this.adminHierarchyService.getAccessibleBranches(req.user.userId, stateId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('accessible-zones/:branchId?')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  @RequireJurisdiction('branch')
  @RequirePermissions(Permission.READ_ZONE)
  async getAccessibleZones(@Request() req, @Param('branchId') branchId?: string) {
    try {
      return await this.adminHierarchyService.getAccessibleZones(req.user.userId, branchId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // Simplified endpoints for selection modal (without restrictive guards)
  @Get('selection/branches')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN)
  async getBranchesForSelection(@Request() req) {
    try {
      return await this.adminHierarchyService.getAccessibleBranches(req.user.userId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('selection/zones')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  async getZonesForSelection(@Request() req) {
    try {
      return await this.adminHierarchyService.getAccessibleZones(req.user.userId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
  @Get('events')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  @RequirePermissions(Permission.READ_EVENT)
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
  // Phase 6: Excel export endpoints
  @Get('export/states')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN)
  async exportStates(@Request() req, @Res() res: Response) {
    try {
      const states = await this.adminHierarchyService.getAccessibleStates(req.user.userId);
      const excelBuffer = this.excelExportService.exportStates(states);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=states_export.xlsx');
      res.send(excelBuffer);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
  @Get('export/branches')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN)
  async exportBranches(@Request() req, @Res() res: Response) {
    try {
      const branches = await this.adminHierarchyService.getAccessibleBranches(req.user.userId);
      const excelBuffer = this.excelExportService.exportBranches(branches);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=branches_export.xlsx');
      res.send(excelBuffer);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
  @Get('export/zones')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN)
  async exportZones(@Request() req, @Res() res: Response) {
    try {
      const zones = await this.adminHierarchyService.getAccessibleZones(req.user.userId);
      const excelBuffer = this.excelExportService.exportZones(zones);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=zones_export.xlsx');
      res.send(excelBuffer);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }  @Get('export/events')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  async exportEvents(@Request() req, @Res() res: Response) {
    try {
      const events = await this.adminHierarchyService.getEventsForAdmin(req.user.userId);
      const excelBuffer = this.excelExportService.exportEvents(events);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=events_export.xlsx');
      res.send(excelBuffer);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
  @Get('export/admins')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN)
  async exportAdmins(@Request() req, @Res() res: Response) {
    try {
      const admins = await this.adminHierarchyService.getAccessibleAdmins(req.user.userId);
      const excelBuffer = this.excelExportService.exportAdmins(admins);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=admins_export.xlsx');
      res.send(excelBuffer);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
  // Branch Admin specific endpoints
  @Get('branch/pending-zone-admins')
  @Roles(Role.BRANCH_ADMIN)
  async getPendingZoneAdmins(@Request() req) {
    try {
      const result = await this.adminHierarchyService.getPendingZoneAdminsByBranch(req.user.userId);
      return result;
    } catch (error) {
      console.error('❌ DEBUG: Error in getPendingZoneAdmins:', error.message);
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('branch/approved-zone-admins')
  @Roles(Role.BRANCH_ADMIN)
  async getApprovedZoneAdmins(@Request() req) {
    try {
      return await this.adminHierarchyService.getApprovedZoneAdminsByBranch(req.user.userId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('branch/approve-zone-admin/:adminId')
  @Roles(Role.BRANCH_ADMIN)
  async approveZoneAdmin(
    @Param('adminId') adminId: string,
    @Body() body: { approvedBy?: string; approvedAt?: string },
    @Request() req
  ) {
    try {
      return await this.adminHierarchyService.approveZoneAdmin(adminId, req.user.userId, body);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('branch/reject-zone-admin/:adminId')
  @Roles(Role.BRANCH_ADMIN)
  async rejectZoneAdmin(
    @Param('adminId') adminId: string,
    @Body() body: { reason: string },
    @Request() req
  ) {
    try {
      return await this.adminHierarchyService.rejectZoneAdmin(adminId, req.user.userId, body.reason);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('branch/zones')
  @Roles(Role.BRANCH_ADMIN)
  async getBranchZones(@Request() req) {
    try {
      return await this.adminHierarchyService.getZonesByBranchAdmin(req.user.userId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('branch/dashboard-stats')
  @Roles(Role.BRANCH_ADMIN)
  async getBranchDashboardStats(@Request() req) {
    try {
      return await this.adminHierarchyService.getBranchDashboardStats(req.user.userId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('events/needing-zone-selection')
  @Roles(Role.BRANCH_ADMIN)
  async getEventsNeedingZoneSelection(@Request() req) {
    try {
      return await this.hierarchicalEventService.getEventsNeedingZoneSelection(req.user.userId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Patch('events/:eventId/select-zones')
  @Roles(Role.BRANCH_ADMIN)
  async selectZonesForEvent(
    @Param('eventId') eventId: string,
    @Body() body: { selectedZones: string[] },
    @Request() req
  ) {
    try {
      return await this.hierarchicalEventService.selectZonesForEvent(
        eventId,
        body.selectedZones,
        req.user.userId
      );
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

  @Get('workers')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  async getAccessibleWorkers(@Request() req) {
    try {
      return await this.adminHierarchyService.getAccessibleWorkers(req.user.userId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('guests')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  async getAccessibleGuests(@Request() req) {
    try {
      return await this.adminHierarchyService.getAccessibleGuests(req.user.userId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // ===============================
  // Performance Rankings Endpoints
  // ===============================

  @Get('rankings/workers')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN)
  async getWorkerRankings(@Request() req, @Query() query: any) {
    try {
      const { branchId, stateId, limit } = query;
      const admin = await this.adminHierarchyService.getAdminWithHierarchy(req.user.userId);
      
      // Determine scope based on admin role and permissions
      let scopedBranchId = branchId;
      let scopedStateId = stateId;
      
      if (admin.role === Role.BRANCH_ADMIN) {
        scopedBranchId = admin.branch._id.toString();
      } else if (admin.role === Role.STATE_ADMIN) {
        scopedStateId = admin.state._id.toString();
      }
      
      return await this.adminHierarchyService.getWorkerRankings(
        scopedBranchId, 
        scopedStateId, 
        limit ? parseInt(limit) : undefined
      );
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('rankings/branches')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN)
  async getBranchRankings(@Request() req, @Query() query: any) {
    try {
      const { stateId, limit } = query;
      const admin = await this.adminHierarchyService.getAdminWithHierarchy(req.user.userId);
      
      // Determine scope based on admin role and permissions
      let scopedStateId = stateId;
      if (admin.role === Role.STATE_ADMIN) {
        scopedStateId = admin.state._id.toString();
      }
      
      return await this.adminHierarchyService.getBranchRankings(
        scopedStateId, 
        limit ? parseInt(limit) : undefined
      );
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('rankings/states')
  @Roles(Role.SUPER_ADMIN)  async getStateRankings(@Query() query: any) {
    try {
      const { limit } = query;
      return await this.adminHierarchyService.getStateRankings(
        limit ? parseInt(limit) : undefined
      );
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // Score Management Endpoints
  @Post('scores/update')
  @Roles(Role.SUPER_ADMIN)
  async updateAllScores() {
    try {
      await this.scoreUpdateService.updateAllScores();
      return { message: 'All scores updated successfully' };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('scores/update-workers')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN)
  async updateWorkerScores() {
    try {
      await this.scoreUpdateService.updateWorkerScores();
      return { message: 'Worker scores updated successfully' };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

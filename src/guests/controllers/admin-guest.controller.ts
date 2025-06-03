import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  Param,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { AdminGuestManagementService } from '../services/admin-guest-management.service';
import { GuestSearchService } from '../services/guest-search.service';
import { GuestImportExportService } from '../services/guest-import-export.service';
import { 
  AdminGuestFiltersDto, 
  BulkGuestOperationDto, 
  UpdateGuestStatusDto,
  GuestExportDto 
} from '../dto/admin-guest.dto';
import { GuestImportDto, GuestSearchDto } from '../dto/guest-import.dto';

@Controller('admin/guests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminGuestController {
  constructor(
    private readonly adminGuestManagementService: AdminGuestManagementService,
    private readonly guestSearchService: GuestSearchService,
    private readonly guestImportExportService: GuestImportExportService,
  ) {}

  /**
   * Get guests with advanced filtering for admins
   */
  @Get()
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)  async getGuestsWithFilters(
    @Query() filters: AdminGuestFiltersDto,
    @Request() req,
  ) {
    // Convert string dates to Date objects
    const processedFilters = {
      ...filters,
      dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
      dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
    };
    
    return this.adminGuestManagementService.getGuestsWithAdvancedFilters(
      req.user.userId,
      processedFilters
    );
  }

  /**
   * Advanced guest search with aggregations
   */
  @Post('search')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  async searchGuests(
    @Body() searchDto: GuestSearchDto,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.guestSearchService.searchGuests(searchDto, page, limit);
  }

  /**
   * Quick guest search by name or phone
   */
  @Get('quick-search')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  async quickSearch(
    @Query('q') searchTerm: string,
    @Query('limit') limit?: number,
  ) {
    return this.guestSearchService.quickSearch(searchTerm, limit);
  }

  /**
   * Find duplicate guests across events
   */
  @Get('duplicates')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN)
  async findDuplicates() {
    return this.guestSearchService.findDuplicateGuests();
  }

  /**
   * Bulk guest operations
   */
  @Post('bulk-operation')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  async bulkOperation(
    @Body() operationDto: BulkGuestOperationDto,
    @Request() req,
  ) {
    return this.adminGuestManagementService.bulkGuestOperation(
      req.user.userId,
      operationDto
    );
  }

  /**
   * Update guest status
   */
  @Patch(':guestId/status')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  async updateGuestStatus(
    @Param('guestId') guestId: string,
    @Body() statusDto: UpdateGuestStatusDto,
  ) {
    return this.adminGuestManagementService.updateGuestStatus(
      guestId,
      statusDto.status
    );
  }

  /**
   * Export guest data
   */
  @Post('export')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)  async exportGuests(
    @Body() exportDto: GuestExportDto,
    @Request() req,
  ) {
    // Convert string dates to Date objects in filters
    const processedFilters = exportDto.filters ? {
      ...exportDto.filters,
      dateFrom: exportDto.filters.dateFrom ? new Date(exportDto.filters.dateFrom) : undefined,
      dateTo: exportDto.filters.dateTo ? new Date(exportDto.filters.dateTo) : undefined,
    } : {};
    
    // Build query from admin's jurisdiction and filters
    const adminGuestData = await this.adminGuestManagementService.getGuestsWithAdvancedFilters(
      req.user.userId,
      processedFilters
    );

    const exportOptions = {
      format: exportDto.format || 'json',
      includeFields: exportDto.includeFields || [],
    };

    // Use the guest IDs to build the query for export
    const guestIds = adminGuestData.guests.map(g => g._id);
    const query = { _id: { $in: guestIds } };

    return this.guestImportExportService.exportGuests(query, exportOptions);
  }

  /**
   * Import guests (Admin can import for any worker in their jurisdiction)
   */
  @Post('events/:eventId/import')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  async importGuests(
    @Param('eventId') eventId: string,
    @Body() importDto: GuestImportDto,
    @Query('workerId') workerId: string,
    @Request() req,
  ) {
    // TODO: Add validation that admin can manage the specified worker
    return this.guestImportExportService.importGuests(
      eventId,
      workerId,
      importDto.guests
    );
  }

  /**
   * Get import template
   */
  @Get('import-template')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  getImportTemplate() {
    return this.guestImportExportService.getImportTemplate();
  }

  /**
   * Validate import data
   */
  @Post('validate-import')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  validateImportData(@Body('data') data: any[]) {
    return this.guestImportExportService.validateImportData(data);
  }

  /**
   * Get guest statistics for admin jurisdiction
   */
  @Get('statistics')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  async getGuestStatistics(@Request() req) {
    const result = await this.adminGuestManagementService.getGuestsWithAdvancedFilters(
      req.user.userId,
      {} // No filters to get all guests in jurisdiction
    );

    return {
      summary: result.summary,
      totalPages: result.totalPages,
      totalGuests: result.total
    };
  }

  /**
   * Override worker restrictions (Super Admin and State Admin only)
   */
  @Patch(':guestId/force-update')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN)
  async forceUpdateGuest(
    @Param('guestId') guestId: string,
    @Body() updateData: any,
    @Request() req,
  ) {
    // Force update guest even if normally restricted
    const operation = {
      guestIds: [guestId],
      operation: 'update' as const,
      data: updateData
    };

    return this.adminGuestManagementService.bulkGuestOperation(
      req.user.userId,
      operation
    );
  }

  /**
   * Delete guest (Admin override)
   */
  @Delete(':guestId/force-delete')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async forceDeleteGuest(
    @Param('guestId') guestId: string,
    @Request() req,
  ) {
    const operation = {
      guestIds: [guestId],
      operation: 'delete' as const
    };

    return this.adminGuestManagementService.bulkGuestOperation(
      req.user.userId,
      operation
    );
  }
}

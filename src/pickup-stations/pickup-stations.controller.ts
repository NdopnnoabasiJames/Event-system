import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Request,
  Res,
} from '@nestjs/common';
import { Response } from 'express';

import { PickupStationsService } from './pickup-stations.service';
import { PickupStationManagementService } from './services/pickup-station-management.service';
import { CreatePickupStationDto } from './dto/create-pickup-station.dto';
import { UpdatePickupStationDto } from './dto/update-pickup-station.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { 
  ZoneSpecificCreateDto, 
  CapacityAndTimeUpdate, 
  FrequentlyUsedStation 
} from './services/pickup-station-management.service';
import { ExcelExportService } from '../common/services/excel-export.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pickup-stations')
export class PickupStationsController {
  constructor(
    private readonly pickupStationsService: PickupStationsService,
    private readonly pickupStationManagementService: PickupStationManagementService,
    private readonly excelExportService: ExcelExportService,
  ) {}
  @Post()
  @Roles(Role.SUPER_ADMIN)
  create(@Body() createPickupStationDto: CreatePickupStationDto) {
    return this.pickupStationsService.create(createPickupStationDto);
  }

  @Get()
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.pickupStationsService.findAll(includeInactive === 'true');
  }

  @Get('by-branch/:branchId')
  findByBranch(
    @Param('branchId') branchId: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.pickupStationsService.findByBranch(branchId, includeInactive === 'true');
  }

  @Get('by-state/:stateId')
  findByState(
    @Param('stateId') stateId: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.pickupStationsService.findByState(stateId, includeInactive === 'true');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pickupStationsService.findOne(id);
  }
  @Patch(':id')
  @Roles(Role.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() updatePickupStationDto: UpdatePickupStationDto) {
    return this.pickupStationsService.update(id, updatePickupStationDto);
  }
  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.pickupStationsService.remove(id);
  }
  @Patch(':id/deactivate')
  @Roles(Role.SUPER_ADMIN)
  deactivate(@Param('id') id: string) {
    return this.pickupStationsService.deactivate(id);
  }
  @Patch(':id/activate')
  @Roles(Role.SUPER_ADMIN)
  activate(@Param('id') id: string) {
    return this.pickupStationsService.activate(id);
  }

  // Zone-based endpoints for Phase 5
  @Get('by-zone/:zoneId')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  findByZone(
    @Param('zoneId') zoneId: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.pickupStationsService.findByZone(zoneId, includeInactive === 'true');
  }

  @Get('by-zone/:zoneId/active')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  findActiveByZone(@Param('zoneId') zoneId: string) {
    return this.pickupStationsService.findActiveByZone(zoneId);
  }

  @Get('by-zone/:zoneId/stats')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  getZoneStats(@Param('zoneId') zoneId: string) {
    return this.pickupStationsService.getZoneStats(zoneId);
  }

  @Patch('by-zone/:zoneId/activate')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN)
  activateByZone(@Param('zoneId') zoneId: string) {
    return this.pickupStationsService.activateByZone(zoneId);
  }

  @Patch('by-zone/:zoneId/deactivate')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN)
  deactivateByZone(@Param('zoneId') zoneId: string) {
    return this.pickupStationsService.deactivateByZone(zoneId);
  }

  // Phase 3.3: Enhanced Pickup Station Endpoints

  // Zone-specific pickup station creation
  @Post('zone/:zoneId/create')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  async createZoneSpecificPickupStation(
    @Param('zoneId') zoneId: string,
    @Body() createDto: ZoneSpecificCreateDto,
    @Request() req
  ) {
    const { userId } = req.user;
    return this.pickupStationManagementService.createZoneSpecificPickupStation(zoneId, userId, createDto);
  }
  // Capacity and departure time management
  @Patch(':stationId/capacity-and-time')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  async updateCapacityAndDepartureTime(
    @Param('stationId') stationId: string,
    @Body() updateData: CapacityAndTimeUpdate,
    @Request() req
  ) {
    const { userId } = req.user;
    return this.pickupStationManagementService.updateCapacityAndDepartureTime(stationId, userId, updateData);
  }

  @Patch('bulk-update-capacity-time')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  async bulkUpdateCapacityAndTime(
    @Body() updates: Array<{ stationId: string } & CapacityAndTimeUpdate>,
    @Request() req
  ) {
    const { userId } = req.user;
    return this.pickupStationManagementService.bulkUpdateCapacityAndTime(userId, updates);
  }

  @Get('capacity-overview')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  async getAvailableCapacityOverview(@Request() req) {
    const { userId } = req.user;
    return this.pickupStationManagementService.getAvailableCapacityOverview(userId);
  }

  // Frequently used stations management  @Get('frequently-used')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  async getFrequentlyUsedStations(
    @Request() req,
    @Query('limit') limit?: string
  ): Promise<FrequentlyUsedStation[]> {
    const { userId } = req.user;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.pickupStationManagementService.getFrequentlyUsedStations(userId, limitNum);
  }

  @Patch(':stationId/mark-used')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  async markStationAsUsed(@Param('stationId') stationId: string, @Request() req) {
    const { userId } = req.user;
    return this.pickupStationManagementService.markStationAsUsed(stationId, userId);
  }  @Get('usage-stats')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  async getPickupStationUsageStats(
    @Request() req,
    @Query('topLimit') topLimit?: string,
    @Query('underutilizedLimit') underutilizedLimit?: string
  ) {
    const { userId } = req.user;
    const topLimitNum = topLimit ? parseInt(topLimit, 10) : undefined;
    const underutilizedLimitNum = underutilizedLimit ? parseInt(underutilizedLimit, 10) : undefined;
    return this.pickupStationManagementService.getPickupStationUsageStats(userId, topLimitNum, underutilizedLimitNum);
  }

  // Phase 6: Excel export endpoint
  @Get('export')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN)
  async exportPickupStations(@Request() req, @Res() res: Response) {
    try {
      // Get pickup stations based on admin's jurisdiction
      const stations = await this.pickupStationManagementService.getAccessiblePickupStations(req.user.userId);
      const excelBuffer = this.excelExportService.exportPickupStations(stations);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=pickup_stations_export.xlsx');
      res.send(excelBuffer);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  // State Admin specific endpoint
  @Get('state-admin/my-stations')
  @Roles(Role.STATE_ADMIN)
  async findByStateAdmin(@Request() req, @Query('includeInactive') includeInactive?: string) {
    const include = includeInactive === 'true';
    return this.pickupStationsService.findByStateAdmin(req.user, include);
  }
}

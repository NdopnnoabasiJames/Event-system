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
} from '@nestjs/common';

import { PickupStationsService } from './pickup-stations.service';
import { CreatePickupStationDto } from './dto/create-pickup-station.dto';
import { UpdatePickupStationDto } from './dto/update-pickup-station.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pickup-stations')
export class PickupStationsController {
  constructor(private readonly pickupStationsService: PickupStationsService) {}
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
}

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
  @Roles(Role.ADMIN)
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
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() updatePickupStationDto: UpdatePickupStationDto) {
    return this.pickupStationsService.update(id, updatePickupStationDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.pickupStationsService.remove(id);
  }

  @Patch(':id/deactivate')
  @Roles(Role.ADMIN)
  deactivate(@Param('id') id: string) {
    return this.pickupStationsService.deactivate(id);
  }

  @Patch(':id/activate')
  @Roles(Role.ADMIN)
  activate(@Param('id') id: string) {
    return this.pickupStationsService.activate(id);
  }
}

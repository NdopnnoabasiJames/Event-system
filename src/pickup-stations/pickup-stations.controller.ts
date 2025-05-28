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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { PickupStationsService } from './pickup-stations.service';
import { CreatePickupStationDto } from './dto/create-pickup-station.dto';
import { UpdatePickupStationDto } from './dto/update-pickup-station.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('Pickup Stations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pickup-stations')
export class PickupStationsController {
  constructor(private readonly pickupStationsService: PickupStationsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new pickup station' })
  @ApiResponse({ status: 201, description: 'Pickup station created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid branch ID or inactive branch' })
  @ApiResponse({ status: 409, description: 'Pickup station with this location already exists in the selected branch' })
  create(@Body() createPickupStationDto: CreatePickupStationDto) {
    return this.pickupStationsService.create(createPickupStationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all pickup stations' })
  @ApiQuery({ 
    name: 'includeInactive', 
    required: false, 
    description: 'Include inactive pickup stations',
    type: Boolean 
  })
  @ApiResponse({ status: 200, description: 'Pickup stations retrieved successfully' })
  findAll(@Query('includeInactive') includeInactive?: string) {
    const include = includeInactive === 'true';
    return this.pickupStationsService.findAll(include);
  }

  @Get('by-branch/:branchId')
  @ApiOperation({ summary: 'Get all pickup stations in a specific branch' })
  @ApiParam({ name: 'branchId', description: 'Branch ID' })
  @ApiQuery({ 
    name: 'includeInactive', 
    required: false, 
    description: 'Include inactive pickup stations',
    type: Boolean 
  })
  @ApiResponse({ status: 200, description: 'Pickup stations retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid branch ID' })
  findByBranch(
    @Param('branchId') branchId: string,
    @Query('includeInactive') includeInactive?: string
  ) {
    const include = includeInactive === 'true';
    return this.pickupStationsService.findByBranch(branchId, include);
  }

  @Get('by-state/:stateId')
  @ApiOperation({ summary: 'Get all pickup stations in a specific state' })
  @ApiParam({ name: 'stateId', description: 'State ID' })
  @ApiQuery({ 
    name: 'includeInactive', 
    required: false, 
    description: 'Include inactive pickup stations',
    type: Boolean 
  })
  @ApiResponse({ status: 200, description: 'Pickup stations retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid state ID' })
  findByState(
    @Param('stateId') stateId: string,
    @Query('includeInactive') includeInactive?: string
  ) {
    const include = includeInactive === 'true';
    return this.pickupStationsService.findByState(stateId, include);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a pickup station by ID' })
  @ApiResponse({ status: 200, description: 'Pickup station retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid pickup station ID' })
  @ApiResponse({ status: 404, description: 'Pickup station not found' })
  findOne(@Param('id') id: string) {
    return this.pickupStationsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a pickup station' })
  @ApiResponse({ status: 200, description: 'Pickup station updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid pickup station ID or branch ID' })
  @ApiResponse({ status: 404, description: 'Pickup station not found' })
  @ApiResponse({ status: 409, description: 'Pickup station with this location already exists in the selected branch' })
  update(@Param('id') id: string, @Body() updatePickupStationDto: UpdatePickupStationDto) {
    return this.pickupStationsService.update(id, updatePickupStationDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a pickup station' })
  @ApiResponse({ status: 200, description: 'Pickup station deleted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid pickup station ID' })
  @ApiResponse({ status: 404, description: 'Pickup station not found' })
  remove(@Param('id') id: string) {
    return this.pickupStationsService.remove(id);
  }

  @Patch(':id/deactivate')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Deactivate a pickup station' })
  @ApiResponse({ status: 200, description: 'Pickup station deactivated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid pickup station ID' })
  @ApiResponse({ status: 404, description: 'Pickup station not found' })
  deactivate(@Param('id') id: string) {
    return this.pickupStationsService.deactivate(id);
  }

  @Patch(':id/activate')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Activate a pickup station' })
  @ApiResponse({ status: 200, description: 'Pickup station activated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid pickup station ID' })
  @ApiResponse({ status: 404, description: 'Pickup station not found' })
  activate(@Param('id') id: string) {
    return this.pickupStationsService.activate(id);
  }
}

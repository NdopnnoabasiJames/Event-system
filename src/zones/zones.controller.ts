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
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ZonesService } from './zones.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('zones')
export class ZonesController {
  constructor(private readonly zonesService: ZonesService) {}  // Super Admin specific endpoint
  @Get('super-admin/all-with-admins')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async findAllWithAdmins(@Query('includeInactive') includeInactive?: string) {
    const include = includeInactive === 'true';
    const result = await this.zonesService.findAllWithAdminsAndPickupStations(include);
    return result;
  }// Branch Admin specific endpoints
  @Get('branch-admin/list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BRANCH_ADMIN)
  findByBranchAdmin(@Req() req: any, @Query('includeInactive') includeInactive?: string) {
    const branchId = req.user.branch;
    if (!branchId) {
      throw new BadRequestException('Branch admin must be assigned to a branch');
    }
    const include = includeInactive === 'true';
    return this.zonesService.findByBranch(branchId, include);
  }

  @Post('branch-admin/create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BRANCH_ADMIN)
  createByBranchAdmin(@Req() req: any, @Body() createZoneDto: CreateZoneDto) {
    const branchId = req.user.branch;
    if (!branchId) {
      throw new BadRequestException('Branch admin must be assigned to a branch');
    }
    // Auto-assign the branchId from the authenticated user
    const zoneData = {
      ...createZoneDto,
      branchId: branchId
    };
    return this.zonesService.createByBranchAdmin(branchId, zoneData);
  }

  @Patch('branch-admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BRANCH_ADMIN)
  updateByBranchAdmin(@Req() req: any, @Param('id') id: string, @Body() updateZoneDto: UpdateZoneDto) {
    const branchId = req.user.branch;
    if (!branchId) {
      throw new BadRequestException('Branch admin must be assigned to a branch');
    }
    return this.zonesService.updateByBranchAdmin(branchId, id, updateZoneDto);
  }

  @Delete('branch-admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BRANCH_ADMIN)
  deleteByBranchAdmin(@Req() req: any, @Param('id') id: string) {
    const branchId = req.user.branch;
    if (!branchId) {
      throw new BadRequestException('Branch admin must be assigned to a branch');
    }
    return this.zonesService.deleteByBranchAdmin(branchId, id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.BRANCH_ADMIN)
  create(@Body() createZoneDto: CreateZoneDto) {
    return this.zonesService.create(createZoneDto);
  }  @Get()
  findAll(@Query('includeInactive') includeInactive?: string) {
    const include = includeInactive === 'true';
    return this.zonesService.findAll(include);
  }

  @Get('by-branch/:branchId')
  findByBranch(
    @Param('branchId') branchId: string,
    @Query('includeInactive') includeInactive?: string
  ) {
    const include = includeInactive === 'true';
    return this.zonesService.findByBranch(branchId, include);
  }

  @Get('by-state/:stateId')
  findByState(
    @Param('stateId') stateId: string,
    @Query('includeInactive') includeInactive?: string
  ) {
    const include = includeInactive === 'true';
    return this.zonesService.findByState(stateId, include);
  }  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.zonesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.BRANCH_ADMIN)
  update(@Param('id') id: string, @Body() updateZoneDto: UpdateZoneDto) {
    return this.zonesService.update(id, updateZoneDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.zonesService.remove(id);
  }

  @Patch(':id/deactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.BRANCH_ADMIN)
  deactivate(@Param('id') id: string) {
    return this.zonesService.deactivate(id);
  }

  @Patch(':id/activate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.BRANCH_ADMIN)
  activate(@Param('id') id: string) {
    return this.zonesService.activate(id);
  }

  // Statistics endpoint
  @Get('statistics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN)
  getZoneStatistics() {
    return this.zonesService.getZoneStatistics();
  }

  // State Admin specific endpoint
  @Get('state-admin/my-zones')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STATE_ADMIN)
  async findByStateAdmin(@Req() req: any, @Query('includeInactive') includeInactive?: string) {
    const include = includeInactive === 'true';
    return this.zonesService.findByStateAdmin(req.user, include);
  }

  @Get('status/:status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  findByStatus(@Param('status') status: string) {
    return this.zonesService.findByStatus(status);
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  approveZone(@Param('id') id: string) {
    return this.zonesService.approveZone(id);
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  rejectZone(@Param('id') id: string) {
    return this.zonesService.rejectZone(id);
  }

  // New: Get pending zones for branch admin (only in their branch)
  @Get('branch-admin/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BRANCH_ADMIN)
  async getPendingZonesForBranchAdmin(@Req() req) {
    return this.zonesService.findPendingByBranchAdmin(req.user);
  }

  // New: Get rejected zones for branch admin (only in their branch)
  @Get('branch-admin/rejected')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BRANCH_ADMIN)
  async getRejectedZonesForBranchAdmin(@Req() req) {
    return this.zonesService.findRejectedByBranchAdmin(req.user);
  }
}

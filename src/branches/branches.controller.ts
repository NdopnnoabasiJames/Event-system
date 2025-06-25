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
} from '@nestjs/common';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  create(@Body() createBranchDto: CreateBranchDto) {
    return this.branchesService.create(createBranchDto);
  }

  @Get()
  findAll(@Query('includeInactive') includeInactive?: string) {
    const include = includeInactive === 'true';
    return this.branchesService.findAll(include);
  }

  @Get('by-state/:stateId')
  findByState(
    @Param('stateId') stateId: string,
    @Query('includeInactive') includeInactive?: string
  ) {
    const include = includeInactive === 'true';
    return this.branchesService.findByState(stateId, include);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.branchesService.findOne(id);
  }  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() updateBranchDto: UpdateBranchDto) {
    return this.branchesService.update(id, updateBranchDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.branchesService.remove(id);
  }

  @Patch(':id/deactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  deactivate(@Param('id') id: string) {
    return this.branchesService.deactivate(id);
  }
  @Patch(':id/activate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  activate(@Param('id') id: string) {
    return this.branchesService.activate(id);
  }

  // State Admin endpoints
  @Post('state-admin/create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STATE_ADMIN)
  createByStateAdmin(@Body() createBranchDto: CreateBranchDto, @Request() req) {
    return this.branchesService.createByStateAdmin(createBranchDto, req.user);
  }

  @Get('state-admin/my-branches')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STATE_ADMIN)
  getMyStateBranches(@Request() req, @Query('includeInactive') includeInactive?: string) {
    const include = includeInactive === 'true';
    return this.branchesService.findByStateAdmin(req.user, include);
  }

  @Patch('state-admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STATE_ADMIN)
  updateByStateAdmin(@Param('id') id: string, @Body() updateBranchDto: UpdateBranchDto, @Request() req) {
    return this.branchesService.updateByStateAdmin(id, updateBranchDto, req.user);
  }

  @Delete('state-admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STATE_ADMIN)
  removeByStateAdmin(@Param('id') id: string, @Request() req) {
    return this.branchesService.removeByStateAdmin(id, req.user);
  }

  // Super Admin endpoint to get all branches with admin details
  @Get('super-admin/all-with-admins')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  getAllBranchesWithAdmins(@Query('includeInactive') includeInactive?: string) {
    const include = includeInactive === 'true';
    return this.branchesService.findAllWithAdmins(include);
  }
}

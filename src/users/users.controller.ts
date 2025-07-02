import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ConvertToRegistrarDto, ConvertToWorkerDto } from './dto/role-conversion.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  getProfile(@Request() req) {
    return this.usersService.findById(req.user.userId);
  }

  // Phase 2: Enhanced system metrics endpoints for Super Admin dashboard
  @Get('system-metrics')
  @Roles(Role.SUPER_ADMIN)
  getSystemMetrics() {
    return this.usersService.getSystemMetrics();
  }

  @Get('admin-hierarchy-stats')
  @Roles(Role.SUPER_ADMIN)
  getAdminHierarchyStats() {
    return this.usersService.getAdminHierarchyStats();
  }
  @Get('user-role-breakdown')
  @Roles(Role.SUPER_ADMIN)
  getUserRoleBreakdown() {
    return this.usersService.getUserRoleBreakdown();
  }

  @Get('workers')
  @Roles(Role.SUPER_ADMIN)
  findAllWorkers() {
    return this.usersService.findAllWorkers();
  }
  // Admin approval endpoints - placed before :id route
  @Get('pending-admins')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN)
  getPendingAdmins(@Request() req) {
    const { currentRole, state, branch } = req.user;
    return this.usersService.getPendingAdmins(currentRole, state, branch);
  }

  @Get('approved-admins')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN)
  getApprovedAdmins(@Request() req) {
    const { currentRole, state, branch } = req.user;
    return this.usersService.getApprovedAdmins(currentRole, state, branch);
  }

  @Post('approve-admin/:id')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN)
  approveAdmin(@Param('id') adminId: string, @Request() req) {
    return this.usersService.approveAdmin(adminId, req.user.userId);
  }
  @Delete('reject-admin/:id')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN)
  rejectAdmin(@Param('id') adminId: string) {
    return this.usersService.rejectAdmin(adminId);
  }  // Branch Admin specific endpoints for State Admin approval workflow
  @Get('pending-branch-admins')
  @Roles(Role.STATE_ADMIN)
  getPendingBranchAdmins(@Request() req) {
    const { state } = req.user;
    return this.usersService.getPendingBranchAdmins(state);
  }

  @Get('approved-branch-admins')
  @Roles(Role.STATE_ADMIN)
  getApprovedBranchAdmins(@Request() req) {
    const { state } = req.user;
    return this.usersService.getApprovedBranchAdmins(state);
  }
  @Post('approve-branch-admin/:id')
  @Roles(Role.STATE_ADMIN)
  approveBranchAdmin(@Param('id') adminId: string, @Request() req) {
    return this.usersService.approveAdmin(adminId, req.user.userId);
  }
  @Post('reject-branch-admin/:id')
  @Roles(Role.STATE_ADMIN)
  rejectBranchAdmin(@Param('id') adminId: string, @Body() body: { reason?: string }) {
    return this.usersService.rejectAdmin(adminId);
  }

  // Zonal Admin specific endpoints for Branch Admin approval workflow
  @Get('pending-zonal-admins')
  @Roles(Role.BRANCH_ADMIN)
  getPendingZonalAdmins(@Request() req) {
    const { branch } = req.user;
    return this.usersService.getPendingZonalAdmins(branch);
  }

  @Get('approved-zonal-admins')
  @Roles(Role.BRANCH_ADMIN)
  getApprovedZonalAdmins(@Request() req) {
    const { branch } = req.user;
    return this.usersService.getApprovedZonalAdmins(branch);
  }

  @Post('approve-zonal-admin/:id')
  @Roles(Role.BRANCH_ADMIN)
  approveZonalAdmin(@Param('id') adminId: string, @Request() req) {
    return this.usersService.approveAdmin(adminId, req.user.userId);
  }

  @Post('reject-zonal-admin/:id')
  @Roles(Role.BRANCH_ADMIN)
  rejectZonalAdmin(@Param('id') adminId: string, @Body() body: { reason?: string }) {
    return this.usersService.rejectAdmin(adminId);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN)
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req,
  ) {
    return this.usersService.update(id, updateUserDto, req.user);
  }  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  remove(@Param('id') id: string, @Request() req) {
    return this.usersService.delete(id, req.user);
  }

  // Role Conversion Endpoints (Super Admin Only)
  @Post('convert-to-registrar')
  @Roles(Role.SUPER_ADMIN)
  convertToRegistrar(@Body() convertDto: ConvertToRegistrarDto, @Request() req) {
    return this.usersService.convertWorkerToRegistrar(
      convertDto.userId,
      req.user.userId,
      convertDto.reason
    );
  }

  @Post('convert-to-worker')
  @Roles(Role.SUPER_ADMIN)
  convertToWorker(@Body() convertDto: ConvertToWorkerDto, @Request() req) {
    return this.usersService.convertRegistrarToWorker(
      convertDto.userId,
      req.user.userId,
      convertDto.reason
    );
  }
}

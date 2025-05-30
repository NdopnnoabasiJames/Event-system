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
  @Get('marketers')
  @Roles(Role.SUPER_ADMIN)
  findAllMarketers() {
    return this.usersService.findAllMarketers();
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
  }
  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  remove(@Param('id') id: string, @Request() req) {
    return this.usersService.delete(id, req.user);
  }

  // Admin approval endpoints
  @Get('pending-admins')
  @Roles(Role.SUPER_ADMIN, Role.STATE_ADMIN)
  getPendingAdmins(@Request() req) {
    const { role, state } = req.user;
    return this.usersService.getPendingAdmins(role, state);
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
  }
}

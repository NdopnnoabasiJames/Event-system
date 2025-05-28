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
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the current user\'s profile',
    type: CreateUserDto
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  getProfile(@Request() req) {
    return this.usersService.findById(req.user.userId);
  }

  @Get('marketers')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all marketers (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns a list of all marketers',
    type: [CreateUserDto]
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - Admin access required' })
  findAllMarketers() {
    return this.usersService.findAllMarketers();
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get user by ID (Admin only)' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the user to retrieve',
    example: '645f3c7e8d6e5a7b1c9d2e3f'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the user details',
    type: CreateUserDto
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the user to update',
    example: '645f3c7e8d6e5a7b1c9d2e3f'
  })
  @ApiBody({
    type: UpdateUserDto,
    description: 'User update data',
    examples: {
      profile: {
        value: {
          name: "John Smith",
          phone: "+1234567890",
          address: "456 Park Avenue, City"
        }
      },
      password: {
        value: {
          currentPassword: "OldPass123!",
          newPassword: "NewPass123!"
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User successfully updated',
    type: CreateUserDto
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - Can only update own profile unless admin' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data' })
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req,
  ) {
    return this.usersService.update(id, updateUserDto, req.user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete user (Admin only)' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the user to delete',
    example: '645f3c7e8d6e5a7b1c9d2e3f'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User successfully deleted'
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  remove(@Param('id') id: string, @Request() req) {
    return this.usersService.delete(id, req.user);
  }
}

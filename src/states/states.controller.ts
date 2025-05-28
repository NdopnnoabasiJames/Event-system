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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { StatesService } from './states.service';
import { CreateStateDto } from './dto/create-state.dto';
import { UpdateStateDto } from './dto/update-state.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('States')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('states')
export class StatesController {
  constructor(private readonly statesService: StatesService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new state' })
  @ApiResponse({ status: 201, description: 'State created successfully' })
  @ApiResponse({ status: 409, description: 'State with this name already exists' })
  create(@Body() createStateDto: CreateStateDto) {
    return this.statesService.create(createStateDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all states' })
  @ApiQuery({ 
    name: 'includeInactive', 
    required: false, 
    description: 'Include inactive states',
    type: Boolean 
  })
  @ApiResponse({ status: 200, description: 'States retrieved successfully' })
  findAll(@Query('includeInactive') includeInactive?: string) {
    const include = includeInactive === 'true';
    return this.statesService.findAll(include);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a state by ID' })
  @ApiResponse({ status: 200, description: 'State retrieved successfully' })
  @ApiResponse({ status: 404, description: 'State not found' })
  findOne(@Param('id') id: string) {
    return this.statesService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a state' })
  @ApiResponse({ status: 200, description: 'State updated successfully' })
  @ApiResponse({ status: 404, description: 'State not found' })
  @ApiResponse({ status: 409, description: 'State with this name already exists' })
  update(@Param('id') id: string, @Body() updateStateDto: UpdateStateDto) {
    return this.statesService.update(id, updateStateDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a state' })
  @ApiResponse({ status: 200, description: 'State deleted successfully' })
  @ApiResponse({ status: 404, description: 'State not found' })
  remove(@Param('id') id: string) {
    return this.statesService.remove(id);
  }

  @Patch(':id/deactivate')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Deactivate a state' })
  @ApiResponse({ status: 200, description: 'State deactivated successfully' })
  @ApiResponse({ status: 404, description: 'State not found' })
  deactivate(@Param('id') id: string) {
    return this.statesService.deactivate(id);
  }

  @Patch(':id/activate')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Activate a state' })
  @ApiResponse({ status: 200, description: 'State activated successfully' })
  @ApiResponse({ status: 404, description: 'State not found' })
  activate(@Param('id') id: string) {
    return this.statesService.activate(id);
  }
}

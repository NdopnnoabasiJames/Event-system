import { Controller, Post, Get, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MigrationService } from './migration.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('Migration')
@Controller('migration')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles(Role.ADMIN)
export class MigrationController {
  constructor(private readonly migrationService: MigrationService) {}

  @Post('run')
  @ApiOperation({ summary: 'Run data migration to populate states, branches, and pickup stations' })
  @ApiResponse({ 
    status: 200, 
    description: 'Migration completed successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        statistics: {
          type: 'object',
          properties: {
            states: { type: 'number' },
            branches: { type: 'number' },
            pickupStations: { type: 'number' },
          }
        }
      }
    }
  })
  async runMigration() {
    await this.migrationService.migrateData();
    const statistics = await this.migrationService.getStatistics();
    
    return {
      message: 'Migration completed successfully',
      statistics,
    };
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get migration statistics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Current statistics',
    schema: {
      type: 'object',
      properties: {
        states: { type: 'number' },
        branches: { type: 'number' },
        pickupStations: { type: 'number' },
      }
    }
  })
  async getStatistics() {
    return await this.migrationService.getStatistics();
  }

  @Delete('reset')
  @ApiOperation({ summary: 'Reset all location data (WARNING: This will delete all states, branches, and pickup stations)' })
  @ApiResponse({ 
    status: 200, 
    description: 'All location data reset successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' }
      }
    }
  })
  async resetData() {
    await this.migrationService.resetData();
    
    return {
      message: 'All location data reset successfully',
    };
  }
}

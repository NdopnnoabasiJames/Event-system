import { Controller, Post, Get, Delete, UseGuards } from '@nestjs/common';

import { MigrationService } from './migration.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('migration')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class MigrationController {
  constructor(private readonly migrationService: MigrationService) {}

  @Post('run')
  async runMigration() {
    return this.migrationService.runMigration();
  }

  @Get('statistics')
  async getMigrationStatistics() {
    return this.migrationService.getMigrationStatistics();
  }

  @Delete('reset')
  async resetMigration() {
    return this.migrationService.resetMigration();
  }
}

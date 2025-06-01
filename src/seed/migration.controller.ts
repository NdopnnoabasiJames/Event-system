import { Controller, Post, Get, Delete, UseGuards } from '@nestjs/common';
import { MigrationService } from './migration.service';
import { NigeriaHierarchySeederService } from './nigeria-hierarchy-seeder.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('migration')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class MigrationController {
  constructor(
    private readonly migrationService: MigrationService,
    private readonly nigeriaHierarchySeederService: NigeriaHierarchySeederService,
  ) {}

  @Post('/migrate')
  async migrateData() {
    await this.migrationService.migrateData();
    return { message: 'Data migration completed successfully' };
  }

  @Get('status')
  async getStatistics() {
    return await this.migrationService.getStatistics();
  }
  @Delete('/reset')
  async resetData() {
    await this.migrationService.resetData();
    return { message: 'All location data reset successfully' };
  }

  @Post('/seed-nigeria-hierarchy')
  async seedNigeriaHierarchy() {
    const result = await this.nigeriaHierarchySeederService.seedNigeriaHierarchy();
    return { 
      message: 'Nigeria church hierarchy seeded successfully',
      ...result
    };
  }

  @Get('/hierarchy-overview')
  async getHierarchyOverview() {
    return await this.nigeriaHierarchySeederService.getHierarchyOverview();
  }
}

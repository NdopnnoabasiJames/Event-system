import { Controller, Post, Get, UseGuards, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CloudinaryMigrationService } from '../common/services/cloudinary-migration.service';

@Controller('migration')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CloudinaryMigrationController {
  constructor(
    private readonly migrationService: CloudinaryMigrationService,
  ) {}

  @Get('cloudinary/status')
  @Roles(Role.ADMIN)
  async getMigrationStatus() {
    try {
      const status = await this.migrationService.getMigrationStatus();
      
      return {
        statusCode: HttpStatus.OK,
        message: 'Migration status retrieved successfully',
        data: status,
      };
    } catch (error) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: `Failed to get migration status: ${error.message}`,
      };
    }
  }

  @Post('cloudinary/migrate')
  @Roles(Role.ADMIN)
  async migrateToCloudinary() {
    try {
      await this.migrationService.migrateLocalImagesToCloudinary();
      
      return {
        statusCode: HttpStatus.OK,
        message: 'Successfully migrated local images to Cloudinary',
      };
    } catch (error) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: `Migration failed: ${error.message}`,
      };
    }
  }

  @Post('cloudinary/cleanup')
  @Roles(Role.ADMIN)
  async cleanupLocalImages() {
    try {
      await this.migrationService.cleanupLocalImages();
      
      return {
        statusCode: HttpStatus.OK,
        message: 'Successfully cleaned up local images',
      };
    } catch (error) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: `Cleanup failed: ${error.message}`,
      };
    }
  }
}

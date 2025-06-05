import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { Role } from '../common/enums/role.enum';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger('SeedService');

  constructor(private readonly usersService: UsersService) {}

  async onModuleInit() {
    this.logger.log('Initializing seed data...');
    await this.seedAdminUser();
  }

  async seedAdminUser() {
    try {
      // Check if admin already exists
      const adminEmail = 'admin@example.com';
      const existingAdmin = await this.usersService.findByEmail(adminEmail);
        if (existingAdmin) {
        // If admin exists but is not approved, approve them
        if (!existingAdmin.isApproved && existingAdmin.role === Role.SUPER_ADMIN) {
          existingAdmin.isApproved = true;
          await existingAdmin.save();
          this.logger.log('Existing super admin has been approved');
        } else {
          this.logger.log('Admin user already exists and is properly configured, skipping seed');
        }
        return;
      }
        // Admin user does not exist, create it
      const hashedPassword = await bcrypt.hash('Admin123!', 10);
        const adminUser = await this.usersService.create({
        name: 'System Admin',
        email: adminEmail,
        password: hashedPassword,
        role: Role.SUPER_ADMIN,
        isApproved: true, // Super admin is auto-approved since there's no higher authority
      });
      
      this.logger.log(`Admin user created with ID: ${adminUser._id}`);
    } catch (error) {
      this.logger.error(`Failed to seed admin user: ${error.message}`, error.stack);
    }
  }
}

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
        this.logger.log('Admin user already exists, skipping seed');
        return;
      }
      
      // Admin user does not exist, create it
      const hashedPassword = await bcrypt.hash('Admin123!', 10);
        const adminUser = await this.usersService.create({
        name: 'System Admin',
        email: adminEmail,
        password: hashedPassword,
        role: Role.SUPER_ADMIN,
      });
      
      this.logger.log(`Admin user created with ID: ${adminUser._id}`);
    } catch (error) {
      this.logger.error(`Failed to seed admin user: ${error.message}`, error.stack);
    }
  }
}

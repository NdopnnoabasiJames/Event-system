import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SeedService } from './seed.service';
import { MigrationService } from './migration.service';
import { MigrationController } from './migration.controller';
import { NigeriaHierarchySeederService } from './nigeria-hierarchy-seeder.service';
import { UsersModule } from '../users/users.module';
import { State, StateSchema } from '../schemas/state.schema';
import { Branch, BranchSchema } from '../schemas/branch.schema';
import { Zone, ZoneSchema } from '../schemas/zone.schema';
import { PickupStation, PickupStationSchema } from '../schemas/pickup-station.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: State.name, schema: StateSchema },
      { name: Branch.name, schema: BranchSchema },
      { name: Zone.name, schema: ZoneSchema },
      { name: PickupStation.name, schema: PickupStationSchema },
    ]),
    UsersModule,
  ],
  controllers: [MigrationController],
  providers: [SeedService, MigrationService, NigeriaHierarchySeederService],
  exports: [SeedService, MigrationService, NigeriaHierarchySeederService],
})
export class SeedModule {}

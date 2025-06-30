import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { State, StateDocument } from '../schemas/state.schema';
import { Branch, BranchDocument } from '../schemas/branch.schema';
import { Zone, ZoneDocument } from '../schemas/zone.schema';
import { PickupStation, PickupStationDocument } from '../schemas/pickup-station.schema';
import { NIGERIA_HIERARCHY_DATA, MockState } from './nigeria-hierarchy-data';

@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);
  constructor(
    @InjectModel(State.name) private stateModel: Model<StateDocument>,
    @InjectModel(Branch.name) private branchModel: Model<BranchDocument>,
    @InjectModel(Zone.name) private zoneModel: Model<ZoneDocument>,
    @InjectModel(PickupStation.name) private pickupStationModel: Model<PickupStationDocument>,  ) {}

  async migrateData(): Promise<void> {
    this.logger.log('Starting comprehensive Nigerian hierarchy data migration...');

    try {
      // Check if migration has already been done
      const existingStates = await this.stateModel.countDocuments();
      if (existingStates > 0) {
        this.logger.log('States already exist, skipping migration');
        return;
      }

      // Create states, branches, and zones from comprehensive Nigerian hierarchy data
      for (const stateData of NIGERIA_HIERARCHY_DATA) {
        await this.createStateWithHierarchy(stateData);
      }

      this.logger.log('Comprehensive Nigerian hierarchy data migration completed successfully');
      
      // Log statistics
      const stats = await this.getStatistics();
      this.logger.log(`Migration statistics: ${JSON.stringify(stats)}`);
    } catch (error) {
      this.logger.error('Migration failed:', error);
      throw error;
    }
  }

  async forceMigrateData(): Promise<void> {
    this.logger.log('Starting force migration - will reset and recreate all data...');

    try {
      // First reset all existing data
      await this.resetData();
      
      this.logger.log('Reset completed, now creating fresh data...');

      // Create states, branches, and zones from comprehensive Nigerian hierarchy data
      for (const stateData of NIGERIA_HIERARCHY_DATA) {
        await this.createStateWithHierarchy(stateData);
      }

      this.logger.log('Force migration completed successfully');
      
      // Log statistics
      const stats = await this.getStatistics();
      this.logger.log(`Force migration statistics: ${JSON.stringify(stats)}`);
    } catch (error) {
      this.logger.error('Force migration failed:', error);
      throw error;
    }
  }

  private async createStateWithHierarchy(stateData: MockState): Promise<void> {
    this.logger.log(`Creating state: ${stateData.name}`);

    // Create state
    const state = new this.stateModel({
      name: stateData.name,
      country: 'Nigeria',
      isActive: true,
    });

    const savedState = await state.save();
    this.logger.log(`Created state: ${stateData.name} with ID: ${savedState._id}`);

    // Create branches for this state
    for (const branchData of stateData.branches) {
      await this.createBranchWithZones(savedState._id, branchData);
    }
  }

  private async createBranchWithZones(stateId: any, branchData: any): Promise<void> {
    this.logger.log(`Creating branch: ${branchData.name}`);

    // Create branch
    const branch = new this.branchModel({
      stateId,
      name: branchData.name,
      location: branchData.address,
      manager: 'TBD',
      contact: '+234-000-000-0000',
      isActive: true,
    });

    const savedBranch = await branch.save();
    this.logger.log(`Created branch: ${branchData.name} with ID: ${savedBranch._id}`);

    // Create zones for this branch
    for (const zoneData of branchData.zones) {
      await this.createZone(savedBranch._id, zoneData);
    }

    this.logger.log(`Branch ${branchData.name} created successfully with ${branchData.zones.length} zones`);
  }

  private async createZone(branchId: any, zoneData: any): Promise<void> {
    this.logger.log(`Creating zone: ${zoneData.name}`);

    // Create zone
    const zone = new this.zoneModel({
      branchId,
      name: zoneData.name,
      isActive: true,
    });

    const savedZone = await zone.save();
    this.logger.log(`Created zone: ${zoneData.name} with ID: ${savedZone._id}`);
  }
  async resetData(): Promise<void> {
    this.logger.log('Resetting all location data...');

    try {
      await Promise.all([
        this.pickupStationModel.deleteMany({}),
        this.zoneModel.deleteMany({}),
        this.branchModel.deleteMany({}),
        this.stateModel.deleteMany({}),
      ]);

      this.logger.log('All location data reset successfully');
    } catch (error) {
      this.logger.error('Reset failed:', error);
      throw error;
    }
  }
  async getStatistics(): Promise<any> {
    const [statesCount, branchesCount, zonesCount, pickupStationsCount] = await Promise.all([
      this.stateModel.countDocuments(),
      this.branchModel.countDocuments(),
      this.zoneModel.countDocuments(),
      this.pickupStationModel.countDocuments(),
    ]);

    return {
      states: statesCount,
      branches: branchesCount,
      zones: zonesCount,
      pickupStations: pickupStationsCount,
    };
  }

  async patchFields(): Promise<void> {
    this.logger.log('Patching all branches with new fields if missing...');
    await this.branchModel.updateMany(
      {},
      {
        $set: {
          totalScore: 0,
          totalInvitedGuests: 0,
          totalCheckedInGuests: 0,
          workersCount: 0,
          status: 'approved',
        }
      }
    );
    this.logger.log('All branches patched with new fields.');
  }
}

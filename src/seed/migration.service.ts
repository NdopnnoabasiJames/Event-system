import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { State, StateDocument } from '../schemas/state.schema';
import { Branch, BranchDocument } from '../schemas/branch.schema';
import { PickupStation, PickupStationDocument } from '../schemas/pickup-station.schema';

@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);

  constructor(
    @InjectModel(State.name) private stateModel: Model<StateDocument>,
    @InjectModel(Branch.name) private branchModel: Model<BranchDocument>,
    @InjectModel(PickupStation.name) private pickupStationModel: Model<PickupStationDocument>,
  ) {}

  // Hardcoded data from the existing system
  private readonly statesAndBranches = {
    'Lagos': ['Lagos Island', 'Lagos Mainland', 'Ikeja', 'Lekki', 'Ajah', 'Ikorodu', 'Epe'],
    'Abuja': ['Central Area', 'Maitama', 'Wuse', 'Garki', 'Asokoro', 'Gwarinpa'],
    'Rivers': ['Port Harcourt', 'Obio/Akpor', 'Eleme', 'Oyigbo'],
    'Kano': ['Kano Municipal', 'Fagge', 'Dala', 'Gwale'],
    'Oyo': ['Ibadan North', 'Ibadan South', 'Ogbomosho', 'Oyo East'],
    'Kaduna': ['Kaduna North', 'Kaduna South', 'Zaria', 'Kafanchan'],
    'Delta': ['Warri', 'Asaba', 'Ughelli', 'Sapele'],
    'Enugu': ['Enugu North', 'Enugu South', 'Nsukka', 'Udi'],
    'Anambra': ['Awka', 'Onitsha', 'Nnewi', 'Ekwulobia'],
    'Imo': ['Owerri', 'Orlu', 'Okigwe', 'Mbaise']
  };

  async migrateData(): Promise<void> {
    this.logger.log('Starting data migration...');

    try {
      // Check if migration has already been done
      const existingStates = await this.stateModel.countDocuments();
      if (existingStates > 0) {
        this.logger.log('States already exist, skipping migration');
        return;
      }

      // Create states and their branches
      for (const [stateName, branchNames] of Object.entries(this.statesAndBranches)) {
        await this.createStateWithBranches(stateName, branchNames);
      }

      this.logger.log('Data migration completed successfully');
    } catch (error) {
      this.logger.error('Migration failed:', error);
      throw error;
    }
  }

  private async createStateWithBranches(stateName: string, branchNames: string[]): Promise<void> {
    this.logger.log(`Creating state: ${stateName}`);

    // Create state
    const state = new this.stateModel({
      name: stateName,
      code: this.generateStateCode(stateName),
      country: 'Nigeria',
      isActive: true,
    });

    const savedState = await state.save();
    this.logger.log(`Created state: ${stateName} with ID: ${savedState._id}`);    // Create branches for this state
    for (const branchName of branchNames) {
      await this.createBranch(savedState._id, branchName);
    }
  }
  private async createBranch(stateId: any, branchName: string): Promise<void> {
    this.logger.log(`Creating branch: ${branchName}`);

    // Create branch
    const branch = new this.branchModel({
      stateId,
      name: branchName,
      location: `${branchName}, Nigeria`,
      manager: 'TBD',
      contact: '+234-000-000-0000',
      isActive: true,
    });

    const savedBranch = await branch.save();
    this.logger.log(`Created branch: ${branchName} with ID: ${savedBranch._id}`);

    // No default pickup stations are created - users will create them manually as needed
    this.logger.log(`Branch ${branchName} created successfully - pickup stations will be added manually`);
  }

  private async createPickupStation(branchId: any, location: string): Promise<void> {
    this.logger.log(`Creating pickup station: ${location}`);

    const pickupStation = new this.pickupStationModel({
      branchId,
      location,
      isActive: true,
    });

    const savedStation = await pickupStation.save();
    this.logger.log(`Created pickup station: ${location} with ID: ${savedStation._id}`);
  }

  private generateStateCode(stateName: string): string {
    // Generate a simple state code from the state name
    return stateName.substring(0, 3).toUpperCase();
  }

  async resetData(): Promise<void> {
    this.logger.log('Resetting all location data...');

    try {
      await Promise.all([
        this.pickupStationModel.deleteMany({}),
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
    const [statesCount, branchesCount, pickupStationsCount] = await Promise.all([
      this.stateModel.countDocuments(),
      this.branchModel.countDocuments(),
      this.pickupStationModel.countDocuments(),
    ]);

    return {
      states: statesCount,
      branches: branchesCount,
      pickupStations: pickupStationsCount,
    };
  }
}

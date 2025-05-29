import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PickupStation, PickupStationDocument } from '../schemas/pickup-station.schema';
import { Branch, BranchDocument } from '../schemas/branch.schema';

@Injectable()
export class CleanupDefaultPickupsService {
  private readonly logger = new Logger(CleanupDefaultPickupsService.name);

  constructor(
    @InjectModel(PickupStation.name) private pickupStationModel: Model<PickupStationDocument>,
    @InjectModel(Branch.name) private branchModel: Model<BranchDocument>,
  ) {}

  async removeDefaultPickupStations(): Promise<void> {
    this.logger.log('Starting cleanup of default pickup stations...');

    try {
      // Get all branches
      const branches = await this.branchModel.find({}).exec();
      
      for (const branch of branches) {
        const branchName = branch.name;
        
        // Define the default pickup station patterns that were auto-generated
        const defaultPickupPatterns = [
          `${branchName} Central Station`,
          `${branchName} Bus Terminal`,
          `${branchName} Main Park`,
        ];

        // Remove pickup stations that match the default patterns
        for (const pattern of defaultPickupPatterns) {
          const result = await this.pickupStationModel.deleteMany({
            location: pattern,
            branchId: branch._id
          });
          
          if (result.deletedCount > 0) {
            this.logger.log(`Removed ${result.deletedCount} default pickup station(s): ${pattern}`);
          }
        }
      }

      this.logger.log('Cleanup of default pickup stations completed successfully');
    } catch (error) {
      this.logger.error('Cleanup failed:', error);
      throw error;
    }
  }

  async getStatistics(): Promise<any> {
    const totalPickupStations = await this.pickupStationModel.countDocuments();
    
    // Count how many default pickup stations still exist
    const branches = await this.branchModel.find({}).exec();
    let defaultPickupCount = 0;
    
    for (const branch of branches) {
      const branchName = branch.name;
      const defaultPickupPatterns = [
        `${branchName} Central Station`,
        `${branchName} Bus Terminal`,
        `${branchName} Main Park`,
      ];
      
      for (const pattern of defaultPickupPatterns) {
        const count = await this.pickupStationModel.countDocuments({
          location: pattern,
          branchId: branch._id
        });
        defaultPickupCount += count;
      }
    }

    return {
      totalPickupStations,
      defaultPickupStations: defaultPickupCount,
      customPickupStations: totalPickupStations - defaultPickupCount,
    };
  }
}

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { State, StateDocument } from '../schemas/state.schema';
import { Branch, BranchDocument } from '../schemas/branch.schema';
import { Zone, ZoneDocument } from '../schemas/zone.schema';
import { NIGERIA_HIERARCHY_DATA, getHierarchyStats } from './nigeria-hierarchy-data';

@Injectable()
export class NigeriaHierarchySeederService {
  constructor(
    @InjectModel(State.name) private stateModel: Model<StateDocument>,
    @InjectModel(Branch.name) private branchModel: Model<BranchDocument>,
    @InjectModel(Zone.name) private zoneModel: Model<ZoneDocument>,
  ) {}

  async seedNigeriaHierarchy() {
    console.log('🇳🇬 Starting Nigeria Church Hierarchy Seeding...');
    
    // Clear existing data (optional - comment out if you want to preserve existing data)
    // await this.clearExistingData();

    const stats = { states: 0, branches: 0, zones: 0 };

    for (const stateData of NIGERIA_HIERARCHY_DATA) {
      try {
        // Check if state already exists
        let state = await this.stateModel.findOne({ name: stateData.name });
        
        if (!state) {
          // Create state
          state = new this.stateModel({
            name: stateData.name,
            code: stateData.code,
            geopoliticalZone: stateData.geopoliticalZone,
            isActive: true
          });
          await state.save();
          stats.states++;
          console.log(`✅ Created state: ${stateData.name}`);
        } else {
          console.log(`⏭️  State already exists: ${stateData.name}`);
        }

        // Create branches for this state
        for (const branchData of stateData.branches) {
          let branch = await this.branchModel.findOne({ 
            name: branchData.name, 
            stateId: state._id 
          });

          if (!branch) {
            branch = new this.branchModel({
              name: branchData.name,
              address: branchData.address,
              stateId: state._id,
              isActive: true
            });
            await branch.save();
            stats.branches++;
            console.log(`  ✅ Created branch: ${branchData.name}`);
          } else {
            console.log(`  ⏭️  Branch already exists: ${branchData.name}`);
          }

          // Create zones for this branch
          for (const zoneData of branchData.zones) {
            let zone = await this.zoneModel.findOne({ 
              name: zoneData.name, 
              branchId: branch._id 
            });

            if (!zone) {
              zone = new this.zoneModel({
                name: zoneData.name,
                description: zoneData.description,
                branchId: branch._id,
                isActive: true
              });
              await zone.save();
              stats.zones++;
              console.log(`    ✅ Created zone: ${zoneData.name}`);
            } else {
              console.log(`    ⏭️  Zone already exists: ${zoneData.name}`);
            }
          }
        }
      } catch (error) {
        console.error(`❌ Error seeding state ${stateData.name}:`, error);
      }
    }

    const expectedStats = getHierarchyStats();
    console.log('\n📊 Seeding Summary:');
    console.log(`States: ${stats.states} created (${expectedStats.states} total in data)`);
    console.log(`Branches: ${stats.branches} created (${expectedStats.branches} total in data)`);
    console.log(`Zones: ${stats.zones} created (${expectedStats.zones} total in data)`);
    console.log('🎉 Nigeria Church Hierarchy Seeding Complete!');

    return {
      success: true,
      created: stats,
      total: expectedStats
    };
  }

  async clearExistingData() {
    console.log('🗑️  Clearing existing hierarchy data...');
    await this.zoneModel.deleteMany({});
    await this.branchModel.deleteMany({});
    await this.stateModel.deleteMany({});
    console.log('✅ Existing data cleared');
  }

  async getHierarchyOverview() {
    const states = await this.stateModel.countDocuments();
    const branches = await this.branchModel.countDocuments();
    const zones = await this.zoneModel.countDocuments();

    return {
      states,
      branches,
      zones,
      expectedFromMockData: getHierarchyStats()
    };
  }
}

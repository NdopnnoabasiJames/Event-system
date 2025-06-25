import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Branch, BranchDocument } from '../schemas/branch.schema';
import { State, StateDocument } from '../schemas/state.schema';
import { Zone, ZoneDocument } from '../schemas/zone.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class BranchesService {  constructor(
    @InjectModel(Branch.name) private branchModel: Model<BranchDocument>,
    @InjectModel(State.name) private stateModel: Model<StateDocument>,
    @InjectModel(Zone.name) private zoneModel: Model<ZoneDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async create(createBranchDto: CreateBranchDto): Promise<BranchDocument> {
    // Validate that the state exists and is active
    const state = await this.stateModel.findOne({ 
      _id: createBranchDto.stateId, 
      isActive: true 
    });
    
    if (!state) {
      throw new BadRequestException('Invalid or inactive state');
    }

    try {
      // Check if branch name already exists in the same state
      const existingBranch = await this.branchModel.findOne({
        name: { $regex: new RegExp(`^${createBranchDto.name}$`, 'i') },
        stateId: createBranchDto.stateId
      });

      if (existingBranch) {
        throw new ConflictException('Branch with this name already exists in the selected state');
      }

      const createdBranch = new this.branchModel(createBranchDto);
      return await createdBranch.save();
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('Branch with this name already exists in the selected state');
      }
      throw error;
    }
  }

  async findAll(includeInactive = false): Promise<BranchDocument[]> {
    const filter = includeInactive ? {} : { isActive: true };
    return await this.branchModel
      .find(filter)
      .populate('stateId', 'name code country isActive')
      .sort({ name: 1 })
      .exec();
  }

  async findByState(stateId: string, includeInactive = false): Promise<BranchDocument[]> {
    if (!Types.ObjectId.isValid(stateId)) {
      throw new BadRequestException('Invalid state ID');
    }

    const filter: any = { stateId };
    if (!includeInactive) {
      filter.isActive = true;
    }

    return await this.branchModel
      .find(filter)
      .populate('stateId', 'name code country isActive')
      .sort({ name: 1 })
      .exec();
  }

  async findOne(id: string): Promise<BranchDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid branch ID');
    }

    const branch = await this.branchModel
      .findById(id)
      .populate('stateId', 'name code country isActive')
      .exec();
    
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
    
    return branch;
  }

  async update(id: string, updateBranchDto: UpdateBranchDto): Promise<BranchDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid branch ID');
    }

    // If stateId is being updated, validate the new state
    if (updateBranchDto.stateId) {
      const state = await this.stateModel.findOne({ 
        _id: updateBranchDto.stateId, 
        isActive: true 
      });
      
      if (!state) {
        throw new BadRequestException('Invalid or inactive state');
      }
    }

    // Check if name already exists in the same state (excluding current branch)
    if (updateBranchDto.name) {
      const currentBranch = await this.branchModel.findById(id);
      if (!currentBranch) {
        throw new NotFoundException('Branch not found');
      }

      const stateIdToCheck = updateBranchDto.stateId || currentBranch.stateId;
      
      const existingBranch = await this.branchModel.findOne({
        name: { $regex: new RegExp(`^${updateBranchDto.name}$`, 'i') },
        stateId: stateIdToCheck,
        _id: { $ne: id }
      });

      if (existingBranch) {
        throw new ConflictException('Branch with this name already exists in the selected state');
      }
    }

    const updatedBranch = await this.branchModel
      .findByIdAndUpdate(id, updateBranchDto, { new: true })
      .populate('stateId', 'name code country isActive')
      .exec();

    if (!updatedBranch) {
      throw new NotFoundException('Branch not found');
    }

    return updatedBranch;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid branch ID');
    }

    const result = await this.branchModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Branch not found');
    }
  }

  async deactivate(id: string): Promise<BranchDocument> {
    return await this.update(id, { isActive: false });
  }
  async activate(id: string): Promise<BranchDocument> {
    return await this.update(id, { isActive: true });
  }

  // State Admin specific methods
  async createByStateAdmin(createBranchDto: CreateBranchDto, user: any): Promise<BranchDocument> {
    // Ensure the branch is created in the state admin's state
    const stateId = typeof user.state === 'string' ? user.state : user.state?._id;
    
    if (!stateId) {
      throw new ForbiddenException('State admin must be assigned to a state');
    }

    // Override the stateId to ensure it's the admin's state
    const branchData = {
      ...createBranchDto,
      stateId
    };

    // Check if branch name already exists in this state
    const existingBranch = await this.branchModel.findOne({
      name: { $regex: new RegExp(`^${createBranchDto.name}$`, 'i') },
      stateId
    });

    if (existingBranch) {
      throw new ConflictException('Branch with this name already exists in your state');
    }

    // Validate that the state exists and is active
    const state = await this.stateModel.findOne({ 
      _id: stateId, 
      isActive: true 
    });
    
    if (!state) {
      throw new BadRequestException('Invalid or inactive state');
    }

    try {
      const createdBranch = new this.branchModel(branchData);
      return await createdBranch.save();
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('Branch with this name already exists in your state');
      }
      throw error;
    }
  }

  async findByStateAdmin(user: any, includeInactive = false): Promise<any[]> {
    const stateId = typeof user.state === 'string' ? user.state : user.state?._id;
    
    if (!stateId) {
      throw new ForbiddenException('State admin must be assigned to a state');
    }

    const filter = { 
      stateId,
      ...(includeInactive ? {} : { isActive: true })
    };

    const branches = await this.branchModel
      .find(filter)
      .populate('stateId', 'name')
      .sort({ name: 1 })
      .exec();

    // Get zone counts for each branch
    const branchesWithCounts = await Promise.all(
      branches.map(async (branch) => {
        const zoneCount = await this.zoneModel.countDocuments({ 
          branchId: branch._id,
          isActive: true 
        });

        return {
          ...branch.toObject(),
          zoneCount
        };
      })
    );

    return branchesWithCounts;
  }

  async updateByStateAdmin(id: string, updateBranchDto: UpdateBranchDto, user: any): Promise<BranchDocument> {
    const stateId = typeof user.state === 'string' ? user.state : user.state?._id;
    
    if (!stateId) {
      throw new ForbiddenException('State admin must be assigned to a state');
    }

    // Check if the branch belongs to the state admin's state
    const branch = await this.branchModel.findOne({ _id: id, stateId });
    
    if (!branch) {
      throw new NotFoundException('Branch not found in your state');
    }

    // Check if new name conflicts with existing branches in the same state
    if (updateBranchDto.name) {
      const existingBranch = await this.branchModel.findOne({
        name: { $regex: new RegExp(`^${updateBranchDto.name}$`, 'i') },
        stateId,
        _id: { $ne: id }
      });

      if (existingBranch) {
        throw new ConflictException('Branch with this name already exists in your state');
      }
    }

    const updatedBranch = await this.branchModel
      .findByIdAndUpdate(id, updateBranchDto, { new: true })
      .populate('stateId', 'name')
      .exec();

    if (!updatedBranch) {
      throw new NotFoundException('Branch not found');
    }

    return updatedBranch;
  }

  async removeByStateAdmin(id: string, user: any): Promise<void> {
    const stateId = typeof user.state === 'string' ? user.state : user.state?._id;
    
    if (!stateId) {
      throw new ForbiddenException('State admin must be assigned to a state');
    }

    // Check if the branch belongs to the state admin's state
    const branch = await this.branchModel.findOne({ _id: id, stateId });
    
    if (!branch) {
      throw new NotFoundException('Branch not found in your state');
    }

    // Check if there are zones associated with this branch
    const zoneCount = await this.zoneModel.countDocuments({ branchId: id });
    
    if (zoneCount > 0) {
      throw new ConflictException('Cannot delete branch that has zones. Please remove or reassign zones first.');
    }

    await this.branchModel.findByIdAndDelete(id).exec();
  }
  // Super Admin method to get all branches with admin details
  async findAllWithAdmins(includeInactive = false): Promise<any[]> {
    const filter = includeInactive ? {} : { isActive: true };
    
    // Get all branches with state information
    const branches = await this.branchModel
      .find(filter)
      .populate('stateId', 'name code country isActive')
      .sort({ name: 1 })
      .lean()
      .exec();

    console.log(`Found ${branches.length} branches`);    // For each branch, find the branch admin
    const branchesWithAdmins = await Promise.all(
      branches.map(async (branch) => {
        // Ensure branch._id is properly handled - it could be string or ObjectId
        const branchId = branch._id.toString();
        
        // Find the branch admin for this branch
        const branchAdmin = await this.userModel
          .findOne({
            role: Role.BRANCH_ADMIN,
            branch: branchId,
            isApproved: true
          })
          .select('name email phone isApproved approvedAt')
          .lean()
          .exec();

        // Debug: Check if there are any BRANCH_ADMIN users for this branch (approved or not)
        const anyBranchAdmin = await this.userModel
          .findOne({
            role: Role.BRANCH_ADMIN,
            branch: branchId
          })
          .select('name email isApproved')
          .lean()
          .exec();

        // Debug: Count all BRANCH_ADMIN users
        const totalBranchAdmins = await this.userModel.countDocuments({
          role: Role.BRANCH_ADMIN,
          branch: branchId
        });

        console.log(`Branch: ${branch.name}, Admin found: ${!!branchAdmin}, Any admin: ${!!anyBranchAdmin}, Total admins: ${totalBranchAdmins}`);        // Count zones in this branch
        const zonesCount = await this.zoneModel.countDocuments({ 
          branchId: branch._id,
          isActive: true 
        });

        // Count workers in this branch
        const workersCount = await this.userModel.countDocuments({
          role: Role.WORKER,
          branch: branchId,
          isApproved: true
        });

        return {
          ...branch,
          branchAdmin: branchAdmin || null,
          zonesCount,
          workersCount,
          // Debug info
          debug: {
            anyBranchAdmin: anyBranchAdmin || null,
            totalBranchAdmins
          }
        };
      })
    );

    return branchesWithAdmins;
  }
}

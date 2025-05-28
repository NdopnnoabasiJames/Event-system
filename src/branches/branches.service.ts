import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Branch, BranchDocument } from '../schemas/branch.schema';
import { State, StateDocument } from '../schemas/state.schema';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesService {
  constructor(
    @InjectModel(Branch.name) private branchModel: Model<BranchDocument>,
    @InjectModel(State.name) private stateModel: Model<StateDocument>,
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
}

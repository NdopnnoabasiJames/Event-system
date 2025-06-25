import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { State, StateDocument } from '../schemas/state.schema';
import { Branch, BranchDocument } from '../schemas/branch.schema';
import { Zone, ZoneDocument } from '../schemas/zone.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { CreateStateDto } from './dto/create-state.dto';
import { UpdateStateDto } from './dto/update-state.dto';

@Injectable()
export class StatesService {
  constructor(
    @InjectModel(State.name) private stateModel: Model<StateDocument>,
    @InjectModel(Branch.name) private branchModel: Model<BranchDocument>,
    @InjectModel(Zone.name) private zoneModel: Model<ZoneDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}
  async create(createStateDto: CreateStateDto): Promise<StateDocument> {
    try {
      // Check name uniqueness
      const existingByName = await this.stateModel.findOne({ 
        name: { $regex: new RegExp(`^${createStateDto.name}$`, 'i') }
      });

      if (existingByName) {
        throw new ConflictException('State with this name already exists');
      }

      // Check code uniqueness if provided
      if (createStateDto.code) {
        const existingByCode = await this.stateModel.findOne({ 
          code: { $regex: new RegExp(`^${createStateDto.code}$`, 'i') }
        });

        if (existingByCode) {
          throw new ConflictException('State with this code already exists');
        }
      }

      const createdState = new this.stateModel(createStateDto);
      return await createdState.save();
    } catch (error) {
      if (error.code === 11000) {
        if (error.keyPattern?.name) {
          throw new ConflictException('State with this name already exists');
        }
        if (error.keyPattern?.code) {
          throw new ConflictException('State with this code already exists');
        }
        throw new ConflictException('Duplicate field error');
      }
      throw error;
    }
  }  async findAll(includeInactive = false): Promise<any[]> {
    const filter = includeInactive ? {} : { isActive: true };
    const states = await this.stateModel
      .find(filter)
      .sort({ name: 1 })
      .exec();

    // Get branch and zone counts for each state, plus state admin info
    const statesWithCounts = await Promise.all(
      states.map(async (state) => {        const branchCount = await this.branchModel.countDocuments({ 
          stateId: state._id,
          isActive: true 
        });
          // Get all branches in this state first
        const branchesInState = await this.branchModel.find({ 
          stateId: state._id,
          isActive: true 
        }).select('_id').lean().exec();
          // Count zones within all branches of this state
        const branchIds = branchesInState.map(branch => branch._id);
        const zoneCount = await this.zoneModel.countDocuments({ 
          branchId: { $in: branchIds },
          isActive: true 
        });

        // Find state admin - compare as string since state field in User is stored as string
        const stateIdString = state._id.toString();
        const stateAdmin = await this.userModel
          .findOne({ 
            state: stateIdString, 
            role: 'state_admin',
            isApproved: true 
          })
          .select('name email')
          .lean()
          .exec();

        return {
          ...state.toObject(),
          branchCount,
          zoneCount,
          stateAdmin: stateAdmin || null
        };
      })
    );

    return statesWithCounts;
  }

  async findOne(id: string): Promise<StateDocument> {
    const state = await this.stateModel.findById(id).exec();
    if (!state) {
      throw new NotFoundException('State not found');
    }
    return state;
  }

  async findByName(name: string): Promise<StateDocument | null> {
    return await this.stateModel
      .findOne({ 
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        isActive: true 
      })
      .exec();
  }
  async update(id: string, updateStateDto: UpdateStateDto): Promise<StateDocument> {
    // Check if name already exists (excluding current state)
    if (updateStateDto.name) {
      const existingByName = await this.stateModel.findOne({
        name: { $regex: new RegExp(`^${updateStateDto.name}$`, 'i') },
        _id: { $ne: id }
      });

      if (existingByName) {
        throw new ConflictException('State with this name already exists');
      }
    }

    // Check if code already exists (excluding current state)
    if (updateStateDto.code) {
      const existingByCode = await this.stateModel.findOne({
        code: { $regex: new RegExp(`^${updateStateDto.code}$`, 'i') },
        _id: { $ne: id }
      });

      if (existingByCode) {
        throw new ConflictException('State with this code already exists');
      }
    }

    const updatedState = await this.stateModel
      .findByIdAndUpdate(id, updateStateDto, { new: true })
      .exec();

    if (!updatedState) {
      throw new NotFoundException('State not found');
    }

    return updatedState;
  }
  async deactivate(id: string): Promise<StateDocument> {
    return await this.update(id, { isActive: false });
  }

  async activate(id: string): Promise<StateDocument> {
    return await this.update(id, { isActive: true });
  }
}

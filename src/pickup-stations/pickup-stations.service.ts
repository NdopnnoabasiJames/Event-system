import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PickupStation, PickupStationDocument } from '../schemas/pickup-station.schema';
import { Branch, BranchDocument } from '../schemas/branch.schema';
import { CreatePickupStationDto } from './dto/create-pickup-station.dto';
import { UpdatePickupStationDto } from './dto/update-pickup-station.dto';

@Injectable()
export class PickupStationsService {
  constructor(
    @InjectModel(PickupStation.name) private pickupStationModel: Model<PickupStationDocument>,
    @InjectModel(Branch.name) private branchModel: Model<BranchDocument>,
  ) {}

  async create(createPickupStationDto: CreatePickupStationDto): Promise<PickupStationDocument> {
    // Validate that the branch exists and is active
    const branch = await this.branchModel.findOne({ 
      _id: createPickupStationDto.branchId, 
      isActive: true 
    }).populate('stateId');
    
    if (!branch) {
      throw new BadRequestException('Invalid or inactive branch');
    }

    try {
      // Check if pickup station location already exists in the same branch
      const existingPickupStation = await this.pickupStationModel.findOne({
        location: { $regex: new RegExp(`^${createPickupStationDto.location}$`, 'i') },
        branchId: createPickupStationDto.branchId
      });

      if (existingPickupStation) {
        throw new ConflictException('Pickup station with this location already exists in the selected branch');
      }

      const createdPickupStation = new this.pickupStationModel(createPickupStationDto);
      return await createdPickupStation.save();
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('Pickup station with this location already exists in the selected branch');
      }
      throw error;
    }
  }

  async findAll(includeInactive = false): Promise<PickupStationDocument[]> {
    const filter = includeInactive ? {} : { isActive: true };
    return await this.pickupStationModel
      .find(filter)
      .populate({
        path: 'branchId',
        select: 'name location manager contact isActive',
        populate: {
          path: 'stateId',
          select: 'name code country isActive'
        }
      })
      .sort({ location: 1 })
      .exec();
  }

  async findByBranch(branchId: string, includeInactive = false): Promise<PickupStationDocument[]> {
    if (!Types.ObjectId.isValid(branchId)) {
      throw new BadRequestException('Invalid branch ID');
    }

    const filter: any = { branchId };
    if (!includeInactive) {
      filter.isActive = true;
    }

    return await this.pickupStationModel
      .find(filter)
      .populate({
        path: 'branchId',
        select: 'name location manager contact isActive',
        populate: {
          path: 'stateId',
          select: 'name code country isActive'
        }
      })
      .sort({ location: 1 })
      .exec();
  }

  async findByState(stateId: string, includeInactive = false): Promise<PickupStationDocument[]> {
    if (!Types.ObjectId.isValid(stateId)) {
      throw new BadRequestException('Invalid state ID');
    }

    // First get all branches in the state
    const branches = await this.branchModel.find({ 
      stateId, 
      isActive: true 
    }).select('_id');

    const branchIds = branches.map(branch => branch._id);

    const filter: any = { branchId: { $in: branchIds } };
    if (!includeInactive) {
      filter.isActive = true;
    }

    return await this.pickupStationModel
      .find(filter)
      .populate({
        path: 'branchId',
        select: 'name location manager contact isActive',
        populate: {
          path: 'stateId',
          select: 'name code country isActive'
        }
      })
      .sort({ location: 1 })
      .exec();
  }

  async findOne(id: string): Promise<PickupStationDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid pickup station ID');
    }

    const pickupStation = await this.pickupStationModel
      .findById(id)
      .populate({
        path: 'branchId',
        select: 'name location manager contact isActive',
        populate: {
          path: 'stateId',
          select: 'name code country isActive'
        }
      })
      .exec();
    
    if (!pickupStation) {
      throw new NotFoundException('Pickup station not found');
    }
    
    return pickupStation;
  }

  async update(id: string, updatePickupStationDto: UpdatePickupStationDto): Promise<PickupStationDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid pickup station ID');
    }

    // If branchId is being updated, validate the new branch
    if (updatePickupStationDto.branchId) {
      const branch = await this.branchModel.findOne({ 
        _id: updatePickupStationDto.branchId, 
        isActive: true 
      });
      
      if (!branch) {
        throw new BadRequestException('Invalid or inactive branch');
      }
    }

    // Check if location already exists in the same branch (excluding current pickup station)
    if (updatePickupStationDto.location) {
      const currentPickupStation = await this.pickupStationModel.findById(id);
      if (!currentPickupStation) {
        throw new NotFoundException('Pickup station not found');
      }

      const branchIdToCheck = updatePickupStationDto.branchId || currentPickupStation.branchId;
      
      const existingPickupStation = await this.pickupStationModel.findOne({
        location: { $regex: new RegExp(`^${updatePickupStationDto.location}$`, 'i') },
        branchId: branchIdToCheck,
        _id: { $ne: id }
      });

      if (existingPickupStation) {
        throw new ConflictException('Pickup station with this location already exists in the selected branch');
      }
    }

    const updatedPickupStation = await this.pickupStationModel
      .findByIdAndUpdate(id, updatePickupStationDto, { new: true })
      .populate({
        path: 'branchId',
        select: 'name location manager contact isActive',
        populate: {
          path: 'stateId',
          select: 'name code country isActive'
        }
      })
      .exec();

    if (!updatedPickupStation) {
      throw new NotFoundException('Pickup station not found');
    }

    return updatedPickupStation;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid pickup station ID');
    }

    const result = await this.pickupStationModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Pickup station not found');
    }
  }

  async deactivate(id: string): Promise<PickupStationDocument> {
    return await this.update(id, { isActive: false });
  }

  async activate(id: string): Promise<PickupStationDocument> {
    return await this.update(id, { isActive: true });
  }
}

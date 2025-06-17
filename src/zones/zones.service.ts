import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Zone, ZoneDocument } from '../schemas/zone.schema';
import { Branch, BranchDocument } from '../schemas/branch.schema';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';

@Injectable()
export class ZonesService {
  constructor(
    @InjectModel(Zone.name) private zoneModel: Model<ZoneDocument>,
    @InjectModel(Branch.name) private branchModel: Model<BranchDocument>,
  ) {}

  async create(createZoneDto: CreateZoneDto): Promise<ZoneDocument> {
    // Validate that the branch exists and is active
    const branch = await this.branchModel.findOne({ 
      _id: createZoneDto.branchId, 
      isActive: true 
    });
    
    if (!branch) {
      throw new BadRequestException('Invalid or inactive branch');
    }

    try {
      // Check if zone name already exists in the same branch
      const existingZone = await this.zoneModel.findOne({
        name: { $regex: new RegExp(`^${createZoneDto.name}$`, 'i') },
        branchId: createZoneDto.branchId
      });

      if (existingZone) {
        throw new ConflictException('Zone with this name already exists in the selected branch');
      }

      const createdZone = new this.zoneModel(createZoneDto);
      return await createdZone.save();
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('Zone with this name already exists in the selected branch');
      }
      throw error;
    }
  }

  async findAll(includeInactive = false): Promise<ZoneDocument[]> {
    const filter = includeInactive ? {} : { isActive: true };
    return await this.zoneModel
      .find(filter)
      .populate({
        path: 'branchId',
        select: 'name location stateId isActive',
        populate: {
          path: 'stateId',
          select: 'name code isActive'
        }
      })
      .sort({ name: 1 })
      .exec();
  }

  async findByBranch(branchId: string, includeInactive = false): Promise<ZoneDocument[]> {
    if (!Types.ObjectId.isValid(branchId)) {
      throw new BadRequestException('Invalid branch ID');
    }

    const filter: any = { branchId };
    if (!includeInactive) {
      filter.isActive = true;
    }

    return await this.zoneModel
      .find(filter)
      .populate({
        path: 'branchId',
        select: 'name location stateId isActive',
        populate: {
          path: 'stateId',
          select: 'name code isActive'
        }
      })
      .sort({ name: 1 })
      .exec();
  }

  async findByState(stateId: string, includeInactive = false): Promise<ZoneDocument[]> {
    if (!Types.ObjectId.isValid(stateId)) {
      throw new BadRequestException('Invalid state ID');
    }

    // First find all branches in the state
    const branches = await this.branchModel.find({ stateId, isActive: true }).select('_id');
    const branchIds = branches.map(branch => branch._id);

    const filter: any = { branchId: { $in: branchIds } };
    if (!includeInactive) {
      filter.isActive = true;
    }

    return await this.zoneModel
      .find(filter)
      .populate({
        path: 'branchId',
        select: 'name location stateId isActive',
        populate: {
          path: 'stateId',
          select: 'name code isActive'
        }
      })
      .sort({ name: 1 })
      .exec();
  }

  async findOne(id: string): Promise<ZoneDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid zone ID');
    }

    const zone = await this.zoneModel
      .findById(id)
      .populate({
        path: 'branchId',
        select: 'name location stateId isActive',
        populate: {
          path: 'stateId',
          select: 'name code isActive'
        }
      })
      .exec();
    
    if (!zone) {
      throw new NotFoundException('Zone not found');
    }
    
    return zone;
  }

  async update(id: string, updateZoneDto: UpdateZoneDto): Promise<ZoneDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid zone ID');
    }

    // If branchId is being updated, validate the new branch
    if (updateZoneDto.branchId) {
      const branch = await this.branchModel.findOne({ 
        _id: updateZoneDto.branchId, 
        isActive: true 
      });
      
      if (!branch) {
        throw new BadRequestException('Invalid or inactive branch');
      }
    }

    // Check if name already exists in the same branch (excluding current zone)
    if (updateZoneDto.name) {
      const currentZone = await this.zoneModel.findById(id);
      if (!currentZone) {
        throw new NotFoundException('Zone not found');
      }

      const branchIdToCheck = updateZoneDto.branchId || currentZone.branchId;
      
      const existingZone = await this.zoneModel.findOne({
        name: { $regex: new RegExp(`^${updateZoneDto.name}$`, 'i') },
        branchId: branchIdToCheck,
        _id: { $ne: id }
      });

      if (existingZone) {
        throw new ConflictException('Zone with this name already exists in the selected branch');
      }
    }

    const updatedZone = await this.zoneModel
      .findByIdAndUpdate(id, updateZoneDto, { new: true })
      .populate({
        path: 'branchId',
        select: 'name location stateId isActive',
        populate: {
          path: 'stateId',
          select: 'name code isActive'
        }
      })
      .exec();

    if (!updatedZone) {
      throw new NotFoundException('Zone not found');
    }

    return updatedZone;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid zone ID');
    }

    const result = await this.zoneModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Zone not found');
    }
  }

  async deactivate(id: string): Promise<ZoneDocument> {
    return await this.update(id, { isActive: false });
  }

  async activate(id: string): Promise<ZoneDocument> {
    return await this.update(id, { isActive: true });
  }

  // Branch Admin specific methods
  async createByBranchAdmin(branchId: string, createZoneDto: CreateZoneDto): Promise<ZoneDocument> {
    // Ensure the zone is created for the branch admin's branch
    const zoneData = {
      ...createZoneDto,
      branchId: branchId
    };
    return await this.create(zoneData);
  }

  async updateByBranchAdmin(branchId: string, zoneId: string, updateZoneDto: UpdateZoneDto): Promise<ZoneDocument> {
    if (!Types.ObjectId.isValid(zoneId)) {
      throw new BadRequestException('Invalid zone ID');
    }

    // First verify that the zone belongs to the branch admin's branch
    const zone = await this.zoneModel.findOne({ _id: zoneId, branchId });
    if (!zone) {
      throw new NotFoundException('Zone not found in your branch');
    }

    // Don't allow changing branchId through this endpoint
    const { branchId: _, ...updateData } = updateZoneDto;
    
    return await this.update(zoneId, updateData);
  }

  async deleteByBranchAdmin(branchId: string, zoneId: string): Promise<void> {
    if (!Types.ObjectId.isValid(zoneId)) {
      throw new BadRequestException('Invalid zone ID');
    }

    // First verify that the zone belongs to the branch admin's branch
    const zone = await this.zoneModel.findOne({ _id: zoneId, branchId });
    if (!zone) {
      throw new NotFoundException('Zone not found in your branch');
    }

    await this.remove(zoneId);
  }
}

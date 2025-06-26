import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PickupStation, PickupStationDocument } from '../schemas/pickup-station.schema';
import { Branch, BranchDocument } from '../schemas/branch.schema';
import { Zone, ZoneDocument } from '../schemas/zone.schema';
import { CreatePickupStationDto } from './dto/create-pickup-station.dto';
import { UpdatePickupStationDto } from './dto/update-pickup-station.dto';

@Injectable()
export class PickupStationsService {
  constructor(
    @InjectModel(PickupStation.name) private pickupStationModel: Model<PickupStationDocument>,
    @InjectModel(Branch.name) private branchModel: Model<BranchDocument>,
    @InjectModel(Zone.name) private zoneModel: Model<ZoneDocument>,
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

    // Validate that the zone exists, is active, and belongs to the specified branch
    const zone = await this.zoneModel.findOne({
      _id: createPickupStationDto.zoneId,
      branchId: createPickupStationDto.branchId,
      isActive: true
    });

    if (!zone) {
      throw new BadRequestException('Invalid or inactive zone, or zone does not belong to the specified branch');
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

    const currentPickupStation = await this.pickupStationModel.findById(id);
    if (!currentPickupStation) {
      throw new NotFoundException('Pickup station not found');
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

    // If zoneId is being updated, validate the zone belongs to the branch
    if (updatePickupStationDto.zoneId) {
      const branchIdToCheck = updatePickupStationDto.branchId || currentPickupStation.branchId;
      
      const zone = await this.zoneModel.findOne({
        _id: updatePickupStationDto.zoneId,
        branchId: branchIdToCheck,
        isActive: true
      });

      if (!zone) {
        throw new BadRequestException('Invalid or inactive zone, or zone does not belong to the specified branch');
      }
    }

    // Check if location already exists in the same branch (excluding current pickup station)
    if (updatePickupStationDto.location) {
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

  // Zone-based methods for Phase 5
  async findByZone(zoneId: string, includeInactive = false): Promise<PickupStationDocument[]> {
    if (!Types.ObjectId.isValid(zoneId)) {
      throw new BadRequestException('Invalid zone ID');
    }

    const filter: any = { zoneId };
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
      .populate({
        path: 'zoneId',
        select: 'name isActive'
      })
      .sort({ location: 1 })
      .exec();
  }

  async findActiveByZone(zoneId: string): Promise<PickupStationDocument[]> {
    return this.findByZone(zoneId, false);
  }

  async activateByZone(zoneId: string): Promise<{ modified: number; stations: PickupStationDocument[] }> {
    if (!Types.ObjectId.isValid(zoneId)) {
      throw new BadRequestException('Invalid zone ID');
    }

    const result = await this.pickupStationModel.updateMany(
      { zoneId, isActive: false },
      { isActive: true }
    );

    const updatedStations = await this.findByZone(zoneId, false);

    return {
      modified: result.modifiedCount,
      stations: updatedStations
    };
  }

  async deactivateByZone(zoneId: string): Promise<{ modified: number; stations: PickupStationDocument[] }> {
    if (!Types.ObjectId.isValid(zoneId)) {
      throw new BadRequestException('Invalid zone ID');
    }

    const result = await this.pickupStationModel.updateMany(
      { zoneId, isActive: true },
      { isActive: false }
    );

    const updatedStations = await this.findByZone(zoneId, true);

    return {
      modified: result.modifiedCount,
      stations: updatedStations
    };
  }

  async getZoneStats(zoneId: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    stations: PickupStationDocument[];
  }> {
    if (!Types.ObjectId.isValid(zoneId)) {
      throw new BadRequestException('Invalid zone ID');
    }

    const allStations = await this.findByZone(zoneId, true);
    const activeStations = allStations.filter(station => station.isActive);
    const inactiveStations = allStations.filter(station => !station.isActive);

    return {
      total: allStations.length,
      active: activeStations.length,
      inactive: inactiveStations.length,
      stations: allStations
    };
  }

  // State Admin method to get all pickup stations in their state
  async findByStateAdmin(user: any, includeInactive = false): Promise<any[]> {
    const stateId = typeof user.state === 'string' ? user.state : user.state?._id;
    
    if (!stateId) {
      throw new BadRequestException('State admin must be assigned to a state');
    }

    // First get all branches in the state
    const branches = await this.branchModel
      .find({ stateId, isActive: true })
      .select('_id')
      .lean()
      .exec();

    const branchIds = branches.map(branch => branch._id);

    if (branchIds.length === 0) {
      return [];
    }

    const filter = { 
      branchId: { $in: branchIds },
      ...(includeInactive ? {} : { isActive: true })
    };

    const pickupStations = await this.pickupStationModel
      .find(filter)
      .populate('branchId', 'name location')
      .populate('zoneId', 'name')
      .sort({ location: 1 })
      .lean()
      .exec();

    return pickupStations;
  }
}

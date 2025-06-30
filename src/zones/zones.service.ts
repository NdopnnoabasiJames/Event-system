import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Zone, ZoneDocument } from '../schemas/zone.schema';
import { Branch, BranchDocument } from '../schemas/branch.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { PickupStation, PickupStationDocument } from '../schemas/pickup-station.schema';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class ZonesService {
  constructor(
    @InjectModel(Zone.name) private zoneModel: Model<ZoneDocument>,
    @InjectModel(Branch.name) private branchModel: Model<BranchDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(PickupStation.name) private pickupStationModel: Model<PickupStationDocument>,
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

      const createdZone = new this.zoneModel({
        ...createZoneDto,
        status: 'pending'
      });
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
          select: 'name isActive'
        }
      })      .sort({ name: 1 })
      .exec();
  }  async findAllWithAdminsAndPickupStations(includeInactive = false): Promise<any[]> {
    const filter = includeInactive ? {} : { isActive: true };
    const zones = await this.zoneModel
      .find(filter)
      .populate({
        path: 'branchId',
        select: 'name location stateId isActive',
        populate: {
          path: 'stateId',
          select: 'name isActive'
        }
      })
      .sort({ name: 1 })
      .lean()
      .exec();

    // Get additional data for each zone
    const zonesWithDetails = await Promise.all(
      zones.map(async (zone) => {        // Find zonal admin
        const zonalAdmin = await this.userModel
          .findOne({ 
            zone: zone._id.toString(), 
            role: Role.ZONAL_ADMIN,
            isApproved: true 
          })
          .select('name email')
          .lean()
          .exec();

        const pickupStationQuery = {
          zoneId: zone._id,
          isActive: true
        };
        
        const pickupStationCount = await this.pickupStationModel.countDocuments(pickupStationQuery);

        return {
          ...zone,
          zonalAdmin: zonalAdmin || null,
          pickupStationCount
        };
      })
    );

    return zonesWithDetails;
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
          select: 'name isActive'
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
          select: 'name isActive'
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
          select: 'name isActive'
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
          select: 'name isActive'
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

  // Statistics methods
  async getZoneStatistics(): Promise<{ totalZones: number; activeZones: number; inactiveZones: number }> {
    const totalZones = await this.zoneModel.countDocuments();
    const activeZones = await this.zoneModel.countDocuments({ isActive: true });
    const inactiveZones = totalZones - activeZones;

    return {
      totalZones,
      activeZones,
      inactiveZones
    };
  }

  // State Admin method to get all zones in their state
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

    const zones = await this.zoneModel
      .find(filter)
      .populate('branchId', 'name location')
      .sort({ name: 1 })
      .lean()
      .exec();

    // Get zone admin info and pickup station counts for each zone
    const zonesWithDetails = await Promise.all(
      zones.map(async (zone) => {
        const zoneId = zone._id.toString();        // Find the zone admin for this zone
        const zonalAdmin = await this.userModel
          .findOne({
            role: Role.ZONAL_ADMIN,
            zone: zoneId,
            isApproved: true
          })
          .select('name email phone isApproved approvedAt')
          .lean()
          .exec();

        // Count pickup stations in this zone
        const pickupStationCount = await this.pickupStationModel.countDocuments({ 
          zoneId: zone._id,
          isActive: true 
        });

        return {
          ...zone,
          zonalAdmin: zonalAdmin || null,
          pickupStationCount
        };
      })
    );

    return zonesWithDetails;
  }

  async findByStatus(status: string): Promise<ZoneDocument[]> {
    return this.zoneModel.find({ status }).populate({
      path: 'branchId',
      select: 'name location stateId isActive',
      populate: { path: 'stateId', select: 'name isActive' }
    }).sort({ name: 1 }).exec();
  }

  async approveZone(id: string): Promise<ZoneDocument> {
    return this.zoneModel.findByIdAndUpdate(id, { status: 'approved', isActive: true }, { new: true }).exec();
  }

  async rejectZone(id: string): Promise<ZoneDocument> {
    return this.zoneModel.findByIdAndUpdate(id, { status: 'rejected', isActive: false }, { new: true }).exec();
  }

  // New: Find pending zones for branch admin (only in their branch)
  async findPendingByBranchAdmin(user: any): Promise<ZoneDocument[]> {
    const branchId = typeof user.branch === 'string' ? user.branch : user.branch?._id;
    if (!branchId) {
      throw new BadRequestException('Branch admin must be assigned to a branch');
    }
    return this.zoneModel.find({ status: 'pending', branchId })
      .populate({
        path: 'branchId',
        select: 'name location stateId isActive',
        populate: { path: 'stateId', select: 'name isActive' }
      })
      .sort({ name: 1 })
      .exec();
  }

  // New: Find rejected zones for branch admin (only in their branch)
  async findRejectedByBranchAdmin(user: any): Promise<ZoneDocument[]> {
    const branchId = typeof user.branch === 'string' ? user.branch : user.branch?._id;
    if (!branchId) {
      throw new BadRequestException('Branch admin must be assigned to a branch');
    }
    return this.zoneModel.find({ status: 'rejected', branchId })
      .populate({
        path: 'branchId',
        select: 'name location stateId isActive',
        populate: { path: 'stateId', select: 'name isActive' }
      })
      .sort({ name: 1 })
      .exec();
  }
}

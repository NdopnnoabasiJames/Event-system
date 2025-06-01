import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Schema as MongooseSchema } from 'mongoose';
import { PickupStation, PickupStationDocument } from '../../schemas/pickup-station.schema';
import { Zone, ZoneDocument } from '../../schemas/zone.schema';
import { User, UserDocument } from '../../schemas/user.schema';
import { Role } from '../../common/enums/role.enum';

interface ZoneSpecificCreateDto {
  location: string;
  capacity: number;
  departureTime: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  facilities?: string[];
  contactInfo?: {
    phone?: string;
    email?: string;
  };
}

interface CapacityAndTimeUpdate {
  capacity?: number;
  departureTime?: string;
  availableCapacity?: number;
}

interface FrequentlyUsedStation {
  stationId: string;
  location: string;
  usageCount: number;
  lastUsed: Date;
  averageCapacity: number;
  isActive: boolean;
}

@Injectable()
export class PickupStationManagementService {
  constructor(
    @InjectModel(PickupStation.name) private pickupStationModel: Model<PickupStationDocument>,
    @InjectModel(Zone.name) private zoneModel: Model<ZoneDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  /**
   * Create pickup station specific to a zone by zonal admin
   */
  async createZoneSpecificPickupStation(
    zoneId: string,
    adminId: string,
    createDto: ZoneSpecificCreateDto
  ): Promise<PickupStationDocument> {
    const admin = await this.userModel.findById(adminId);
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    // Validate admin can create in this zone
    if (admin.role !== Role.ZONAL_ADMIN || admin.zone?.toString() !== zoneId) {
      if (admin.role !== Role.SUPER_ADMIN && admin.role !== Role.STATE_ADMIN && admin.role !== Role.BRANCH_ADMIN) {
        throw new UnauthorizedException('Only zonal admin or higher can create pickup stations in this zone');
      }
    }    // Get zone with populated branch and state
    const zone = await this.zoneModel.findById(zoneId)
      .populate({
        path: 'branchId',
        populate: {
          path: 'stateId',
          select: 'name code'
        }
      })
      .exec();

    if (!zone) {
      throw new NotFoundException('Zone not found');
    }

    const branch = zone.branchId as any;
    const state = branch.stateId as any;

    // Check if pickup station location already exists in the same zone
    const existingStation = await this.pickupStationModel.findOne({
      location: { $regex: new RegExp(`^${createDto.location}$`, 'i') },
      zoneId: zoneId
    });

    if (existingStation) {
      throw new BadRequestException('Pickup station with this location already exists in this zone');
    }    const pickupStation = new this.pickupStationModel({
      ...createDto,
      zoneId: zoneId,
      branchId: zone.branchId,
      stateId: state._id,
      createdBy: adminId,
      // Let the schema defaults handle initial values
    });

    return await pickupStation.save();
  }

  /**
   * Update capacity and departure time for pickup stations in admin's jurisdiction
   */
  async updateCapacityAndDepartureTime(
    stationId: string,
    adminId: string,
    updateData: CapacityAndTimeUpdate
  ): Promise<PickupStationDocument> {
    const admin = await this.userModel.findById(adminId);
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const station = await this.pickupStationModel.findById(stationId);
    if (!station) {
      throw new NotFoundException('Pickup station not found');
    }

    // Validate admin can update this station
    await this.validateStationAccess(station, admin);

    // Update the fields
    if (updateData.capacity !== undefined) {
      station.capacity = updateData.capacity;
      // Recalculate average capacity
      station.averageCapacity = (station.averageCapacity + updateData.capacity) / 2;
    }

    if (updateData.departureTime !== undefined) {
      station.departureTime = updateData.departureTime;
    }    if (updateData.availableCapacity !== undefined) {
      station.availableCapacity = updateData.availableCapacity;
    }    station.lastModified = new Date();
    station.lastModifiedBy = adminId as any;

    return await station.save();
  }

  /**
   * Bulk update capacity and departure times for multiple stations
   */
  async bulkUpdateCapacityAndTime(
    adminId: string,
    updates: Array<{ stationId: string } & CapacityAndTimeUpdate>
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const admin = await this.userModel.findById(adminId);
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const update of updates) {
      try {
        await this.updateCapacityAndDepartureTime(update.stationId, adminId, update);
        success++;
      } catch (error) {
        failed++;
        errors.push(`Station ${update.stationId}: ${error.message}`);
      }
    }

    return { success, failed, errors };
  }

  /**
   * Get frequently used pickup stations in admin's jurisdiction
   */
  async getFrequentlyUsedStations(adminId: string, limit: number = 10): Promise<FrequentlyUsedStation[]> {
    const admin = await this.userModel.findById(adminId);
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    let query: any = {};

    // Build query based on admin role and jurisdiction
    if (admin.role === Role.ZONAL_ADMIN) {
      query.zoneId = admin.zone;
    } else if (admin.role === Role.BRANCH_ADMIN) {
      query.branchId = admin.branch;
    } else if (admin.role === Role.STATE_ADMIN) {
      query.stateId = admin.state;
    }
    // Super admins can see all

    const stations = await this.pickupStationModel
      .find(query)
      .sort({ usageCount: -1, lastUsed: -1 })
      .limit(limit)
      .lean();

    return stations.map(station => ({
      stationId: station._id.toString(),
      location: station.location,
      usageCount: station.usageCount || 0,
      lastUsed: station.lastUsed || new Date(),
      averageCapacity: station.averageCapacity || station.capacity,
      isActive: station.isActive,
    }));
  }

  /**
   * Mark a pickup station as frequently used (increment usage count)
   */
  async markStationAsUsed(stationId: string, adminId: string): Promise<PickupStationDocument> {
    const admin = await this.userModel.findById(adminId);
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const station = await this.pickupStationModel.findById(stationId);
    if (!station) {
      throw new NotFoundException('Pickup station not found');
    }

    await this.validateStationAccess(station, admin);

    station.usageCount = (station.usageCount || 0) + 1;
    station.lastUsed = new Date();

    return await station.save();
  }
  /**
   * Get pickup station usage statistics for admin's jurisdiction
   */
  async getPickupStationUsageStats(
    adminId: string,
    topLimit: number = 5,
    underutilizedLimit: number = 5
  ): Promise<{
    totalStations: number;
    activeStations: number;
    inactiveStations: number;
    averageUsage: number;
    topUsedStations: FrequentlyUsedStation[];
    underutilizedStations: FrequentlyUsedStation[];
  }> {
    const admin = await this.userModel.findById(adminId);
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    let query: any = {};

    // Build query based on admin role and jurisdiction
    if (admin.role === Role.ZONAL_ADMIN) {
      query.zoneId = admin.zone;
    } else if (admin.role === Role.BRANCH_ADMIN) {
      query.branchId = admin.branch;
    } else if (admin.role === Role.STATE_ADMIN) {
      query.stateId = admin.state;
    }

    const allStations = await this.pickupStationModel.find(query);
    const activeStations = allStations.filter(s => s.isActive);
    const inactiveStations = allStations.filter(s => !s.isActive);

    const totalUsage = allStations.reduce((sum, station) => sum + (station.usageCount || 0), 0);
    const averageUsage = allStations.length > 0 ? totalUsage / allStations.length : 0;

    // Get top used stations
    const topUsedStations = await this.getFrequentlyUsedStations(adminId, topLimit);

    // Get underutilized stations
    const underutilizedQuery = await this.pickupStationModel
      .find(query)
      .sort({ usageCount: 1, lastUsed: 1 })
      .limit(underutilizedLimit)
      .lean();

    const underutilizedStations = underutilizedQuery.map(station => ({
      stationId: station._id.toString(),
      location: station.location,
      usageCount: station.usageCount || 0,
      lastUsed: station.lastUsed || new Date(),
      averageCapacity: station.averageCapacity || station.capacity,
      isActive: station.isActive,
    }));

    return {
      totalStations: allStations.length,
      activeStations: activeStations.length,
      inactiveStations: inactiveStations.length,
      averageUsage,
      topUsedStations,
      underutilizedStations,
    };
  }


  /**
   * Get available capacity across all pickup stations in admin's jurisdiction
   */
  async getAvailableCapacityOverview(adminId: string): Promise<{
    totalCapacity: number;
    availableCapacity: number;
    utilizationRate: number;
    stationBreakdown: Array<{
      stationId: string;
      location: string;
      totalCapacity: number;
      availableCapacity: number;
      utilizationRate: number;
    }>;
  }> {
    const admin = await this.userModel.findById(adminId);
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    let query: any = { isActive: true };

    // Build query based on admin role and jurisdiction
    if (admin.role === Role.ZONAL_ADMIN) {
      query.zoneId = admin.zone;
    } else if (admin.role === Role.BRANCH_ADMIN) {
      query.branchId = admin.branch;
    } else if (admin.role === Role.STATE_ADMIN) {
      query.stateId = admin.state;
    }

    const stations = await this.pickupStationModel.find(query);

    let totalCapacity = 0;
    let totalAvailable = 0;
    const stationBreakdown = [];

    for (const station of stations) {
      const capacity = station.capacity || 0;
      const available = station.availableCapacity !== undefined ? station.availableCapacity : capacity;
      const utilization = capacity > 0 ? ((capacity - available) / capacity) * 100 : 0;

      totalCapacity += capacity;
      totalAvailable += available;

      stationBreakdown.push({
        stationId: station._id.toString(),
        location: station.location,
        totalCapacity: capacity,
        availableCapacity: available,
        utilizationRate: utilization,
      });
    }

    const overallUtilization = totalCapacity > 0 ? ((totalCapacity - totalAvailable) / totalCapacity) * 100 : 0;

    return {
      totalCapacity,
      availableCapacity: totalAvailable,
      utilizationRate: overallUtilization,
      stationBreakdown,
    };
  }

  // Helper methods
  private async validateStationAccess(station: PickupStationDocument, admin: UserDocument): Promise<void> {
    if (admin.role === Role.SUPER_ADMIN) return;

    if (admin.role === Role.STATE_ADMIN) {
      if (station.stateId?.toString() !== admin.state?.toString()) {
        throw new UnauthorizedException('Access denied to this pickup station');
      }
    } else if (admin.role === Role.BRANCH_ADMIN) {
      if (station.branchId?.toString() !== admin.branch?.toString()) {
        throw new UnauthorizedException('Access denied to this pickup station');
      }
    } else if (admin.role === Role.ZONAL_ADMIN) {
      if (station.zoneId?.toString() !== admin.zone?.toString()) {
        throw new UnauthorizedException('Access denied to this pickup station');
      }
    }
  }

}

// Export interfaces for use in controller
export { ZoneSpecificCreateDto, CapacityAndTimeUpdate, FrequentlyUsedStation };

import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Event, EventDocument } from '../../schemas/event.schema';
import { AdminHierarchyService } from '../../admin-hierarchy/admin-hierarchy.service';
import { CreateEventDto } from '../dto/create-event.dto';
import { CreateHierarchicalEventDto } from '../dto/create-hierarchical-event.dto';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class HierarchicalEventCreationService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    private adminHierarchyService: AdminHierarchyService,
  ) {}

  /**
   * Create event by Super Admin
   */
  async createSuperAdminEvent(
    createEventDto: CreateHierarchicalEventDto,
    creatorId: string
  ): Promise<EventDocument> {
    const admin = await this.adminHierarchyService.getAdminWithHierarchy(creatorId);
    
    if (admin.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only super admins can create super admin events');
    }

    // Validate selected states
    if (!createEventDto.selectedStates?.length) {
      throw new BadRequestException('Super admin must select at least one state');
    }

    const stateIds = createEventDto.selectedStates.map(id => new Types.ObjectId(id));    const eventData = {
      name: createEventDto.name,
      description: createEventDto.description,
      date: createEventDto.date,
      bannerImage: createEventDto.bannerImage,
      createdBy: new Types.ObjectId(creatorId),
      creatorLevel: 'super_admin',
      scope: 'national', // Super admin events are always national level
      availableStates: stateIds,
      availableBranches: [], // Will be populated by state admins
      availableZones: [], // Will be populated by branch admins
      pickupStations: [],
      marketers: [],
      isActive: true,
    };

    const event = new this.eventModel(eventData);
    return await event.save();
  }

  /**
   * Create event by State Admin
   */
  async createStateAdminEvent(
    createEventDto: CreateHierarchicalEventDto,
    creatorId: string
  ): Promise<EventDocument> {
    const admin = await this.adminHierarchyService.getAdminWithHierarchy(creatorId);
    
    if (admin.role !== Role.STATE_ADMIN) {
      throw new ForbiddenException('Only state admins can create state admin events');
    }

    // Validate selected branches are in admin's state
    if (!createEventDto.selectedBranches?.length) {
      throw new BadRequestException('State admin must select at least one branch');
    }

    const branchIds = createEventDto.selectedBranches.map(id => new Types.ObjectId(id));
    
    // Verify all branches belong to admin's state
    for (const branchId of branchIds) {
      const canAccess = await this.adminHierarchyService.canAccessBranch(creatorId, branchId.toString());
      if (!canAccess) {
        throw new ForbiddenException('Cannot select branches outside your state');
      }
    }

    const eventData = {
      name: createEventDto.name,
      description: createEventDto.description,
      date: createEventDto.date,
      bannerImage: createEventDto.bannerImage,
      createdBy: new Types.ObjectId(creatorId),
      creatorLevel: 'state_admin',
      availableStates: [admin.state],
      availableBranches: branchIds,
      availableZones: [], // Will be populated by branch admins
      pickupStations: [],
      marketers: [],
      isActive: true,
    };

    const event = new this.eventModel(eventData);
    return await event.save();
  }

  /**
   * Create event by Branch Admin
   */
  async createBranchAdminEvent(
    createEventDto: CreateHierarchicalEventDto,
    creatorId: string
  ): Promise<EventDocument> {
    const admin = await this.adminHierarchyService.getAdminWithHierarchy(creatorId);
    
    if (admin.role !== Role.BRANCH_ADMIN) {
      throw new ForbiddenException('Only branch admins can create branch admin events');
    }

    // Validate selected zones are in admin's branch
    if (!createEventDto.selectedZones?.length) {
      throw new BadRequestException('Branch admin must select at least one zone');
    }

    const zoneIds = createEventDto.selectedZones.map(id => new Types.ObjectId(id));
    
    // Verify all zones belong to admin's branch
    for (const zoneId of zoneIds) {
      const canAccess = await this.adminHierarchyService.canAccessZone(creatorId, zoneId.toString());
      if (!canAccess) {
        throw new ForbiddenException('Cannot select zones outside your branch');
      }
    }

    const eventData = {
      name: createEventDto.name,
      description: createEventDto.description,
      date: createEventDto.date,
      bannerImage: createEventDto.bannerImage,
      createdBy: new Types.ObjectId(creatorId),
      creatorLevel: 'branch_admin',
      availableStates: [], // Will be populated based on branch's state
      availableBranches: [admin.branch],
      availableZones: zoneIds,
      pickupStations: [],
      marketers: [],
      isActive: true,
    };

    const event = new this.eventModel(eventData);
    return await event.save();
  }

  /**
   * Create event by Zonal Admin
   */
  async createZonalAdminEvent(
    createEventDto: CreateEventDto,
    creatorId: string
  ): Promise<EventDocument> {
    const admin = await this.adminHierarchyService.getAdminWithHierarchy(creatorId);
    
    if (admin.role !== Role.ZONAL_ADMIN) {
      throw new ForbiddenException('Only zonal admins can create zonal admin events');
    }

    if (!admin.zone) {
      throw new BadRequestException('Zonal admin must be assigned to a zone');
    }

    const eventData = {
      name: createEventDto.name,
      description: createEventDto.description,
      date: createEventDto.date,
      bannerImage: createEventDto.bannerImage,
      createdBy: new Types.ObjectId(creatorId),
      creatorLevel: 'zonal_admin',
      availableStates: [], // Will be populated based on zone's hierarchy
      availableBranches: [], // Will be populated based on zone's branch
      availableZones: [admin.zone],
      pickupStations: [],
      marketers: [],
      isActive: true,
    };

    const event = new this.eventModel(eventData);
    return await event.save();
  }
}

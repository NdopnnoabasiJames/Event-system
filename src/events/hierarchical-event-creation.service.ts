import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Event, EventDocument } from '../schemas/event.schema';
import { AdminHierarchyService } from '../admin-hierarchy/admin-hierarchy.service';
import { CreateEventDto } from './dto/create-event.dto';
import { Role } from '../common/enums/role.enum';

export interface CreateHierarchicalEventDto extends CreateEventDto {
  selectedStates?: string[]; // For super admin
  selectedBranches?: string[]; // For state admin
}

export interface UpdateEventAvailabilityDto {
  eventId: string;
  selectedStates?: string[];
  selectedBranches?: string[];
}

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

    const stateIds = createEventDto.selectedStates.map(id => new Types.ObjectId(id));

    const eventData = {
      name: createEventDto.name,
      description: createEventDto.description,
      date: createEventDto.date,
      bannerImage: createEventDto.bannerImage,
      createdBy: new Types.ObjectId(creatorId),
      creatorLevel: 'super_admin',
      availableStates: stateIds,
      availableBranches: [], // Will be populated by state admins
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
    createEventDto: CreateEventDto,
    creatorId: string
  ): Promise<EventDocument> {
    const admin = await this.adminHierarchyService.getAdminWithHierarchy(creatorId);
    
    if (admin.role !== Role.BRANCH_ADMIN) {
      throw new ForbiddenException('Only branch admins can create branch admin events');
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
      pickupStations: [],
      marketers: [],
      isActive: true,
    };

    const event = new this.eventModel(eventData);
    return await event.save();
  }

  /**
   * State admin selects branches for super admin event
   */
  async selectBranchesForEvent(
    eventId: string,
    selectedBranches: string[],
    stateAdminId: string
  ): Promise<EventDocument> {
    const admin = await this.adminHierarchyService.getAdminWithHierarchy(stateAdminId);
    
    if (admin.role !== Role.STATE_ADMIN) {
      throw new ForbiddenException('Only state admins can select branches');
    }

    const event = await this.eventModel.findById(eventId);
    if (!event) {
      throw new BadRequestException('Event not found');
    }

    if (event.creatorLevel !== 'super_admin') {
      throw new BadRequestException('Can only select branches for super admin events');
    }

    // Check if admin's state is in the event's available states
    const adminStateInEvent = event.availableStates.some(
      stateId => stateId.toString() === admin.state.toString()
    );

    if (!adminStateInEvent) {
      throw new ForbiddenException('Event is not available in your state');
    }

    // Validate all selected branches belong to admin's state
    const branchIds = selectedBranches.map(id => new Types.ObjectId(id));
    for (const branchId of branchIds) {
      const canAccess = await this.adminHierarchyService.canAccessBranch(stateAdminId, branchId.toString());
      if (!canAccess) {
        throw new ForbiddenException('Cannot select branches outside your state');
      }
    }

    // Add branches to event (don't replace, add to existing)
    const existingBranches = event.availableBranches.map(id => id.toString());
    const newBranches = branchIds.filter(id => !existingBranches.includes(id.toString()));
    
    event.availableBranches.push(...newBranches);
    
    return await event.save();
  }

  /**
   * Get events that need branch selection by state admin
   */
  async getEventsNeedingBranchSelection(stateAdminId: string): Promise<EventDocument[]> {
    const admin = await this.adminHierarchyService.getAdminWithHierarchy(stateAdminId);
    
    if (admin.role !== Role.STATE_ADMIN) {
      throw new ForbiddenException('Only state admins can access this');
    }

    return this.eventModel
      .find({
        creatorLevel: 'super_admin',
        availableStates: admin.state,
      })
      .populate('createdBy', 'name email')
      .populate('availableStates', 'name')
      .populate('availableBranches', 'name location')
      .sort({ createdAt: -1 })
      .exec();
  }
}

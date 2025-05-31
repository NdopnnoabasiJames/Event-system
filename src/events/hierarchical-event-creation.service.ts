import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Event, EventDocument, EventPickupStation } from '../schemas/event.schema';
import { PickupStation, PickupStationDocument } from '../schemas/pickup-station.schema';
import { AdminHierarchyService } from '../admin-hierarchy/admin-hierarchy.service';
import { CreateEventDto } from './dto/create-event.dto';
import { CreateHierarchicalEventDto } from './dto/create-hierarchical-event.dto';
import { UpdateEventAvailabilityDto } from './dto/update-event-availability.dto';
import { 
  AssignPickupStationsDto, 
  UpdatePickupStationAssignmentDto, 
  RemovePickupStationAssignmentDto 
} from './dto/assign-pickup-stations.dto';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class HierarchicalEventCreationService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    @InjectModel(PickupStation.name) private pickupStationModel: Model<PickupStationDocument>,
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
    }    const eventData = {
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

  /**
   * Branch admin selects zones for state/super admin event
   */
  async selectZonesForEvent(
    eventId: string,
    selectedZones: string[],
    branchAdminId: string
  ): Promise<EventDocument> {
    const admin = await this.adminHierarchyService.getAdminWithHierarchy(branchAdminId);
    
    if (admin.role !== Role.BRANCH_ADMIN) {
      throw new ForbiddenException('Only branch admins can select zones');
    }

    const event = await this.eventModel.findById(eventId);
    if (!event) {
      throw new BadRequestException('Event not found');
    }

    if (!['super_admin', 'state_admin'].includes(event.creatorLevel)) {
      throw new BadRequestException('Can only select zones for super admin or state admin events');
    }

    // Check if admin's branch is in the event's available branches
    const adminBranchInEvent = event.availableBranches.some(
      branchId => branchId.toString() === admin.branch.toString()
    );

    if (!adminBranchInEvent) {
      throw new ForbiddenException('Event is not available in your branch');
    }

    // Validate all selected zones belong to admin's branch
    const zoneIds = selectedZones.map(id => new Types.ObjectId(id));
    for (const zoneId of zoneIds) {
      const canAccess = await this.adminHierarchyService.canAccessZone(branchAdminId, zoneId.toString());
      if (!canAccess) {
        throw new ForbiddenException('Cannot select zones outside your branch');
      }
    }

    // Add zones to event (don't replace, add to existing)
    const existingZones = event.availableZones.map(id => id.toString());
    const newZones = zoneIds.filter(id => !existingZones.includes(id.toString()));
    
    event.availableZones.push(...newZones);
    
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

  /**
   * Get events that need zone selection by branch admin
   */
  async getEventsNeedingZoneSelection(branchAdminId: string): Promise<EventDocument[]> {
    const admin = await this.adminHierarchyService.getAdminWithHierarchy(branchAdminId);
    
    if (admin.role !== Role.BRANCH_ADMIN) {
      throw new ForbiddenException('Only branch admins can access this');
    }

    return this.eventModel
      .find({
        creatorLevel: { $in: ['super_admin', 'state_admin'] },
        availableBranches: admin.branch,
      })
      .populate('createdBy', 'name email')
      .populate('availableStates', 'name')
      .populate('availableBranches', 'name location')
      .populate('availableZones', 'name')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Get accessible events for an admin based on their role and hierarchy
   */
  async getAccessibleEvents(adminId: string): Promise<EventDocument[]> {
    const admin = await this.adminHierarchyService.getAdminWithHierarchy(adminId);

    let query: any = {};

    switch (admin.role) {
      case Role.SUPER_ADMIN:
        // Super admins can see all events
        query = {};
        break;

      case Role.STATE_ADMIN:
        // State admins can see events in their state
        query = {
          $or: [
            { creatorLevel: 'super_admin', availableStates: admin.state },
            { creatorLevel: 'state_admin', availableStates: admin.state },
            { createdBy: new Types.ObjectId(adminId) }
          ]
        };
        break;

      case Role.BRANCH_ADMIN:
        // Branch admins can see events in their branch
        query = {
          $or: [
            { creatorLevel: 'super_admin', availableBranches: admin.branch },
            { creatorLevel: 'state_admin', availableBranches: admin.branch },
            { creatorLevel: 'branch_admin', availableBranches: admin.branch },
            { createdBy: new Types.ObjectId(adminId) }
          ]
        };
        break;

      case Role.ZONAL_ADMIN:
        // Zonal admins can see events in their zone
        if (!admin.zone) {
          throw new BadRequestException('Zonal admin must be assigned to a zone');
        }
        query = {
          $or: [
            { creatorLevel: 'super_admin', availableZones: admin.zone },
            { creatorLevel: 'state_admin', availableZones: admin.zone },
            { creatorLevel: 'branch_admin', availableZones: admin.zone },
            { creatorLevel: 'zonal_admin', availableZones: admin.zone },
            { createdBy: new Types.ObjectId(adminId) }
          ]
        };
        break;

      default:
        throw new ForbiddenException('Invalid admin role');
    }

    return this.eventModel
      .find(query)
      .populate('createdBy', 'name email')
      .populate('availableStates', 'name')
      .populate('availableBranches', 'name location')
      .populate('availableZones', 'name')
      .populate('pickupStations', 'name location')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Update event availability (for admin modifications)
   */
  async updateEventAvailability(
    updateDto: UpdateEventAvailabilityDto,
    adminId: string
  ): Promise<EventDocument> {
    const admin = await this.adminHierarchyService.getAdminWithHierarchy(adminId);
    const event = await this.eventModel.findById(updateDto.eventId);

    if (!event) {
      throw new BadRequestException('Event not found');
    }

    // Only creator or higher level admin can update availability
    const canUpdate = event.createdBy.toString() === adminId || 
                     this.canAdminUpdateEvent(admin.role, event.creatorLevel);

    if (!canUpdate) {
      throw new ForbiddenException('Not authorized to update this event');
    }

    // Update based on provided fields
    if (updateDto.selectedStates && admin.role === Role.SUPER_ADMIN) {
      event.availableStates = updateDto.selectedStates.map(id => new Types.ObjectId(id));
    }

    if (updateDto.selectedBranches && [Role.SUPER_ADMIN, Role.STATE_ADMIN].includes(admin.role)) {
      // Validate branches are accessible to admin
      for (const branchId of updateDto.selectedBranches) {
        const canAccess = await this.adminHierarchyService.canAccessBranch(adminId, branchId);
        if (!canAccess) {
          throw new ForbiddenException('Cannot assign branches outside your access');
        }
      }
      event.availableBranches = updateDto.selectedBranches.map(id => new Types.ObjectId(id));
    }

    if (updateDto.selectedZones && [Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN].includes(admin.role)) {
      // Validate zones are accessible to admin
      for (const zoneId of updateDto.selectedZones) {
        const canAccess = await this.adminHierarchyService.canAccessZone(adminId, zoneId);
        if (!canAccess) {
          throw new ForbiddenException('Cannot assign zones outside your access');
        }
      }
      event.availableZones = updateDto.selectedZones.map(id => new Types.ObjectId(id));
    }

    return await event.save();
  }

  /**
   * Helper method to check if admin can update event based on hierarchy
   */
  private canAdminUpdateEvent(adminRole: Role, eventCreatorLevel: string): boolean {
    const hierarchy = {
      'super_admin': 4,
      'state_admin': 3,
      'branch_admin': 2,
      'zonal_admin': 1
    };

    const roleHierarchy = {
      [Role.SUPER_ADMIN]: 4,
      [Role.STATE_ADMIN]: 3,
      [Role.BRANCH_ADMIN]: 2,
      [Role.ZONAL_ADMIN]: 1
    };

    return roleHierarchy[adminRole] > hierarchy[eventCreatorLevel];
  }

  /**
   * Phase 6: Pickup Station Assignment Methods
   * Allow Zonal Admins to select pickup stations for events
   */

  /**
   * Get events available for pickup station assignment by Zonal Admin
   */
  async getEventsForPickupAssignment(zonalAdminId: string): Promise<EventDocument[]> {
    const admin = await this.adminHierarchyService.getAdminWithHierarchy(zonalAdminId);
    
    if (admin.role !== Role.ZONAL_ADMIN) {
      throw new ForbiddenException('Only zonal admins can assign pickup stations');
    }

    if (!admin.zone) {
      throw new BadRequestException('Zonal admin must be assigned to a zone');
    }

    // Find events where this zone is included in availableZones
    return await this.eventModel.find({
      availableZones: admin.zone,
      isActive: true,
      date: { $gte: new Date().toISOString() } // Only future events
    })
    .populate('createdBy', 'firstName lastName email')
    .populate('availableStates', 'name code')
    .populate('availableBranches', 'name location')
    .populate('availableZones', 'name')
    .populate('pickupStations.pickupStationId', 'location branchId zoneId')
    .sort({ date: 1 })
    .exec();
  }

  /**
   * Assign pickup stations to an event by Zonal Admin
   */
  async assignPickupStations(
    assignDto: AssignPickupStationsDto,
    zonalAdminId: string
  ): Promise<EventDocument> {
    const admin = await this.adminHierarchyService.getAdminWithHierarchy(zonalAdminId);
    
    if (admin.role !== Role.ZONAL_ADMIN) {
      throw new ForbiddenException('Only zonal admins can assign pickup stations');
    }

    if (!admin.zone) {
      throw new BadRequestException('Zonal admin must be assigned to a zone');
    }

    const event = await this.eventModel.findById(assignDto.eventId);
    if (!event) {
      throw new BadRequestException('Event not found');
    }

    // Check if the event is available in admin's zone
    const zoneIncluded = event.availableZones.some(
      zoneId => zoneId.toString() === admin.zone.toString()
    );

    if (!zoneIncluded) {
      throw new ForbiddenException('Event is not available in your zone');
    }

    // Validate that all pickup stations belong to admin's zone and are active
    const pickupStationIds = assignDto.pickupStations.map(ps => ps.pickupStationId);
    const pickupStations = await this.pickupStationModel.find({
      _id: { $in: pickupStationIds },
      zoneId: admin.zone,
      isActive: true
    });

    if (pickupStations.length !== pickupStationIds.length) {
      throw new BadRequestException('Some pickup stations are invalid, inactive, or not in your zone');
    }

    // Remove existing pickup stations for this zone from the event
    event.pickupStations = event.pickupStations.filter(
      ps => !pickupStations.some(station => station._id.toString() === ps.pickupStationId.toString())
    );

    // Add new pickup stations assignments
    const newPickupStations: EventPickupStation[] = assignDto.pickupStations.map(ps => ({
      pickupStationId: new Types.ObjectId(ps.pickupStationId),
      departureTime: ps.departureTime,
      maxCapacity: ps.maxCapacity || 50,
      currentCount: 0,
      notes: ps.notes
    }));

    event.pickupStations.push(...newPickupStations);

    return await event.save();
  }

  /**
   * Update a specific pickup station assignment
   */
  async updatePickupStationAssignment(
    updateDto: UpdatePickupStationAssignmentDto,
    zonalAdminId: string
  ): Promise<EventDocument> {
    const admin = await this.adminHierarchyService.getAdminWithHierarchy(zonalAdminId);
    
    if (admin.role !== Role.ZONAL_ADMIN) {
      throw new ForbiddenException('Only zonal admins can update pickup station assignments');
    }

    if (!admin.zone) {
      throw new BadRequestException('Zonal admin must be assigned to a zone');
    }

    const event = await this.eventModel.findById(updateDto.eventId);
    if (!event) {
      throw new BadRequestException('Event not found');
    }

    // Check if the event is available in admin's zone
    const zoneIncluded = event.availableZones.some(
      zoneId => zoneId.toString() === admin.zone.toString()
    );

    if (!zoneIncluded) {
      throw new ForbiddenException('Event is not available in your zone');
    }

    // Validate pickup station belongs to admin's zone
    const pickupStation = await this.pickupStationModel.findOne({
      _id: updateDto.pickupStationId,
      zoneId: admin.zone,
      isActive: true
    });

    if (!pickupStation) {
      throw new BadRequestException('Pickup station not found, inactive, or not in your zone');
    }

    // Find and update the pickup station assignment
    const assignmentIndex = event.pickupStations.findIndex(
      ps => ps.pickupStationId.toString() === updateDto.pickupStationId
    );

    if (assignmentIndex === -1) {
      throw new BadRequestException('Pickup station is not assigned to this event');
    }

    // Update the assignment
    if (updateDto.departureTime) {
      event.pickupStations[assignmentIndex].departureTime = updateDto.departureTime;
    }
    if (updateDto.maxCapacity) {
      event.pickupStations[assignmentIndex].maxCapacity = updateDto.maxCapacity;
    }
    if (updateDto.notes !== undefined) {
      event.pickupStations[assignmentIndex].notes = updateDto.notes;
    }

    return await event.save();
  }

  /**
   * Remove pickup station assignment from event
   */
  async removePickupStationAssignment(
    removeDto: RemovePickupStationAssignmentDto,
    zonalAdminId: string
  ): Promise<EventDocument> {
    const admin = await this.adminHierarchyService.getAdminWithHierarchy(zonalAdminId);
    
    if (admin.role !== Role.ZONAL_ADMIN) {
      throw new ForbiddenException('Only zonal admins can remove pickup station assignments');
    }

    if (!admin.zone) {
      throw new BadRequestException('Zonal admin must be assigned to a zone');
    }

    const event = await this.eventModel.findById(removeDto.eventId);
    if (!event) {
      throw new BadRequestException('Event not found');
    }

    // Check if the event is available in admin's zone
    const zoneIncluded = event.availableZones.some(
      zoneId => zoneId.toString() === admin.zone.toString()
    );

    if (!zoneIncluded) {
      throw new ForbiddenException('Event is not available in your zone');
    }

    // Validate pickup station belongs to admin's zone
    const pickupStation = await this.pickupStationModel.findOne({
      _id: removeDto.pickupStationId,
      zoneId: admin.zone
    });

    if (!pickupStation) {
      throw new BadRequestException('Pickup station not found or not in your zone');
    }

    // Remove the pickup station assignment
    event.pickupStations = event.pickupStations.filter(
      ps => ps.pickupStationId.toString() !== removeDto.pickupStationId
    );

    return await event.save();
  }

  /**
   * Get pickup stations available for assignment in admin's zone
   */
  async getAvailablePickupStations(zonalAdminId: string): Promise<PickupStationDocument[]> {
    const admin = await this.adminHierarchyService.getAdminWithHierarchy(zonalAdminId);
    
    if (admin.role !== Role.ZONAL_ADMIN) {
      throw new ForbiddenException('Only zonal admins can view available pickup stations');
    }

    if (!admin.zone) {
      throw new BadRequestException('Zonal admin must be assigned to a zone');
    }

    return await this.pickupStationModel.find({
      zoneId: admin.zone,
      isActive: true
    })
    .populate('branchId', 'name location')
    .populate('zoneId', 'name')
    .sort({ location: 1 })
    .exec();
  }

  /**
   * Get pickup station assignments for a specific event in admin's zone
   */
  async getEventPickupStations(
    eventId: string,
    zonalAdminId: string
  ): Promise<{ event: EventDocument; pickupStations: any[] }> {
    const admin = await this.adminHierarchyService.getAdminWithHierarchy(zonalAdminId);
    
    if (admin.role !== Role.ZONAL_ADMIN) {
      throw new ForbiddenException('Only zonal admins can view event pickup stations');
    }

    if (!admin.zone) {
      throw new BadRequestException('Zonal admin must be assigned to a zone');
    }

    const event = await this.eventModel.findById(eventId)
      .populate('pickupStations.pickupStationId', 'location branchId zoneId')
      .exec();

    if (!event) {
      throw new BadRequestException('Event not found');
    }

    // Check if the event is available in admin's zone
    const zoneIncluded = event.availableZones.some(
      zoneId => zoneId.toString() === admin.zone.toString()
    );

    if (!zoneIncluded) {
      throw new ForbiddenException('Event is not available in your zone');
    }

    // Filter pickup stations to only show those in admin's zone
    const zonePickupStations = event.pickupStations.filter(ps => {
      const station = ps.pickupStationId as any;
      return station && station.zoneId && station.zoneId.toString() === admin.zone.toString();
    });

    return {
      event,
      pickupStations: zonePickupStations
    };
  }
}

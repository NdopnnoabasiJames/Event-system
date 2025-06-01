import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Event, EventDocument } from '../../schemas/event.schema';
import { AdminHierarchyService } from '../../admin-hierarchy/admin-hierarchy.service';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class HierarchicalEventSelectionService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    private adminHierarchyService: AdminHierarchyService,
  ) {}

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
}

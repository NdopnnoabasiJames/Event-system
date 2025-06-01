import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Event, EventDocument } from '../../schemas/event.schema';
import { AdminHierarchyService } from '../../admin-hierarchy/admin-hierarchy.service';
import { UpdateEventAvailabilityDto } from '../dto/update-event-availability.dto';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class HierarchicalEventAvailabilityService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    private adminHierarchyService: AdminHierarchyService,
  ) {}

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
}

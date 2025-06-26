import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Event, EventDocument } from '../../schemas/event.schema';
import { AdminHierarchyService } from '../../admin-hierarchy/admin-hierarchy.service';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class HierarchicalEventAccessService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    private adminHierarchyService: AdminHierarchyService,
  ) {}  /**
   * Get events that need branch selection by state admin
   */
  async getEventsNeedingBranchSelection(stateAdminId: string): Promise<EventDocument[]> {
    const admin = await this.adminHierarchyService.getAdminWithHierarchy(stateAdminId);
    
    if (admin.role !== Role.STATE_ADMIN) {
      throw new ForbiddenException('Only state admins can access this');
    }

    return this.eventModel
      .find({
        $or: [
          // Super admin events available in this state
          {
            creatorLevel: 'super_admin',
            availableStates: admin.state,
          },
          // State admin events that can be further delegated
          {
            creatorLevel: 'state_admin',
            createdBy: new Types.ObjectId(stateAdminId),
            availableBranches: { $exists: true, $not: { $size: 0 } }
          }        ]
      })      .populate('createdBy', 'name email')
      .populate('availableStates', 'name')
      .populate('availableBranches', 'name location')
      .populate('selectedBranches', 'name location')
      .populate('selectedZones', 'name')
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
      })      .populate('createdBy', 'name email')
      .populate('availableStates', 'name')
      .populate('availableBranches', 'name location')
      .populate('availableZones', 'name')
      .populate('selectedBranches', 'name location')
      .populate('selectedZones', 'name')
      .sort({ createdAt: -1 })
      .exec();
  }  /**
   * Get accessible events for an admin based on their role and hierarchy
   */  async getAccessibleEvents(adminId: string): Promise<EventDocument[]> {
    const admin = await this.adminHierarchyService.getAdminWithHierarchy(adminId);
    let query: any = {};

    switch (admin.role) {      case Role.SUPER_ADMIN:
        // Super admins can see all events
        query = {};
        break;      case Role.STATE_ADMIN:
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
        break;      case Role.ZONAL_ADMIN:
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

    const events = await this.eventModel
      .find(query)      .populate('createdBy', 'name email')
      .populate('availableStates', 'name')
      .populate('availableBranches', 'name location')
      .populate('availableZones', 'name')
      .populate('pickupStations', 'name location')
      .populate('selectedBranches', 'name location')
      .populate('selectedZones', 'name')
      .sort({ createdAt: -1 })
      .exec();
        
    return events;
  }  /**
   * Get events available for pickup station assignment by Zonal Admin
   */
  async getEventsForPickupAssignment(zonalAdminId: string): Promise<EventDocument[]> {
    try {
      const admin = await this.adminHierarchyService.getAdminWithHierarchy(zonalAdminId);
      
      if (admin.role !== Role.ZONAL_ADMIN) {
        throw new ForbiddenException('Only zonal admins can assign pickup stations');
      }

      if (!admin.zone) {
        throw new BadRequestException('Zonal admin must be assigned to a zone');
      }

      // Find events where this zone is included in availableZones
      const events = await this.eventModel.find({
        availableZones: admin.zone,
        status: { $in: ['draft', 'published', 'active'] }, // Include draft events for pickup assignment
        // Temporarily allow past events for testing - in production you may want: date: { $gte: new Date() }
      })      .populate('createdBy', 'firstName lastName email')
      .populate('availableStates', 'name code')
      .populate('availableBranches', 'name location')
      .populate('availableZones', 'name')
      .populate('selectedBranches', 'name location')
      .populate('selectedZones', 'name')
      .sort({ date: 1 })
      .exec();

      return events;
    } catch (error) {
      throw error;
    }
  }
}

import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../schemas/user.schema';
import { Zone, ZoneDocument } from '../../schemas/zone.schema';
import { Event, EventDocument } from '../../schemas/event.schema';
import { Guest, GuestDocument } from '../../schemas/guest.schema';
import { Role } from '../../common/enums/role.enum';
import { AdminHierarchyCoreService } from './admin-hierarchy-core.service';

/**
 * Service for branch admin dashboard statistics
 */
@Injectable()
export class DashboardStatsService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Zone.name) private zoneModel: Model<ZoneDocument>,
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    @InjectModel(Guest.name) private guestModel: Model<GuestDocument>,
    private adminHierarchyCoreService: AdminHierarchyCoreService,
  ) {}

  /**
   * Get dashboard statistics for a branch admin
   */
  async getBranchDashboardStats(branchAdminId: string): Promise<any> {
    const admin = await this.adminHierarchyCoreService.getAdminWithHierarchy(branchAdminId);

    if (admin.role !== Role.BRANCH_ADMIN) {
      throw new ForbiddenException('Only branch admins can access this');
    }

    // Use the branch ObjectId and convert to string to match stored data
    const branchObjectId = admin.branch._id || admin.branch;
    const branchId = branchObjectId.toString();

    const [zones, events, guests, pendingZoneAdmins, approvedZoneAdmins] =
      await Promise.all([
        this.zoneModel.countDocuments({ branchId: branchId, isActive: true }),
        this.eventModel.countDocuments({
          $or: [
            { availableBranches: { $in: [branchId] } },
            { createdBy: branchAdminId, creatorLevel: 'branch_admin' },
          ],
          // Include all statuses except cancelled and completed
          status: { $in: ['draft', 'published'] },
        }),
        this.guestModel.countDocuments({ branch: branchId }),
        this.userModel.countDocuments({
          role: Role.ZONAL_ADMIN,
          branch: branchId,
          isApproved: false,
          isActive: true,
        }),
        this.userModel.countDocuments({
          role: Role.ZONAL_ADMIN,
          branch: branchId,
          isApproved: true,
          isActive: true,
        }),
      ]);

    return {
      totalZones: zones,
      activeEvents: events,
      totalGuests: guests,
      totalRegistrations: guests, // For now, same as guests
      pendingZoneAdmins: pendingZoneAdmins,
      approvedZoneAdmins: approvedZoneAdmins,
    };
  }
}

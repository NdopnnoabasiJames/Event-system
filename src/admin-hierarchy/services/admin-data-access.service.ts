import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../schemas/user.schema';
import { State, StateDocument } from '../../schemas/state.schema';
import { Branch, BranchDocument } from '../../schemas/branch.schema';
import { Zone, ZoneDocument } from '../../schemas/zone.schema';
import { Event, EventDocument } from '../../schemas/event.schema';
import { Guest, GuestDocument } from '../../schemas/guest.schema';
import { Role } from '../../common/enums/role.enum';
import { AdminHierarchyCoreService } from './admin-hierarchy-core.service';

/**
 * Service for data access operations (states, branches, zones, events, users)
 */
@Injectable()
export class AdminDataAccessService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(State.name) private stateModel: Model<StateDocument>,
    @InjectModel(Branch.name) private branchModel: Model<BranchDocument>,
    @InjectModel(Zone.name) private zoneModel: Model<ZoneDocument>,
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    @InjectModel(Guest.name) private guestModel: Model<GuestDocument>,
    private adminHierarchyCoreService: AdminHierarchyCoreService,
  ) {}

  /**
   * Get states accessible by admin
   */
  async getAccessibleStates(adminId: string): Promise<StateDocument[]> {
    const admin = await this.adminHierarchyCoreService.getAdminWithHierarchy(adminId);

    switch (admin.role) {
      case Role.SUPER_ADMIN:
        return this.stateModel.find({ isActive: true }).exec();
      case Role.STATE_ADMIN:
        return this.stateModel
          .find({ _id: admin.state, isActive: true })
          .exec();
      case Role.BRANCH_ADMIN:
        const branch = await this.branchModel.findById(admin.branch).exec();
        return this.stateModel
          .find({ _id: branch?.stateId, isActive: true })
          .exec();
      case Role.ZONAL_ADMIN:
        const zone = await this.zoneModel
          .findById(admin.zone)
          .populate('branchId')
          .exec();
        const zoneBranch = zone?.branchId as any;
        return this.stateModel
          .find({ _id: zoneBranch?.stateId, isActive: true })
          .exec();
      default:
        return [];
    }
  }

  /**
   * Get branches accessible by admin
   */
  async getAccessibleBranches(
    adminId: string,
    stateId?: string,
  ): Promise<BranchDocument[]> {
    const admin = await this.adminHierarchyCoreService.getAdminWithHierarchy(adminId);

    switch (admin.role) {
      case Role.SUPER_ADMIN:
        const query = stateId
          ? { stateId: stateId, isActive: true }
          : { isActive: true };
        return this.branchModel.find(query).populate('stateId', 'name').exec();
      case Role.STATE_ADMIN:
        const stateQuery = { stateId: admin.state, isActive: true };
        return this.branchModel
          .find(stateQuery)
          .populate('stateId', 'name')
          .exec();
      case Role.BRANCH_ADMIN:
        return this.branchModel
          .find({ _id: admin.branch, isActive: true })
          .populate('stateId', 'name')
          .exec();
      case Role.ZONAL_ADMIN:
        const zone = await this.zoneModel.findById(admin.zone).exec();
        return this.branchModel
          .find({ _id: zone?.branchId, isActive: true })
          .populate('stateId', 'name')
          .exec();
      default:
        return [];
    }
  }

  /**
   * Get zones accessible by admin
   */
  async getAccessibleZones(
    adminId: string,
    branchId?: string,
  ): Promise<ZoneDocument[]> {
    const admin = await this.adminHierarchyCoreService.getAdminWithHierarchy(adminId);

    switch (admin.role) {
      case Role.SUPER_ADMIN:
        const query = branchId
          ? { branchId: branchId, isActive: true }
          : { isActive: true };
        return this.zoneModel
          .find(query)
          .populate('branchId', 'name location')
          .exec();
      case Role.STATE_ADMIN:
        // State admin can access zones in all branches within their state
        const branches = await this.branchModel
          .find({ stateId: admin.state, isActive: true })
          .select('_id');
        const branchIds = branches.map((branch) => branch._id);
        return this.zoneModel
          .find({ branchId: { $in: branchIds }, isActive: true })
          .populate('branchId', 'name location')
          .exec();
      case Role.BRANCH_ADMIN:
        return this.zoneModel
          .find({ branchId: admin.branch, isActive: true })
          .populate('branchId', 'name location')
          .exec();
      case Role.ZONAL_ADMIN:
        return this.zoneModel
          .find({ _id: admin.zone, isActive: true })
          .populate('branchId', 'name location')
          .exec();
      default:
        return [];
    }
  }

  /**
   * Get events visible to admin based on hierarchy
   */
  async getEventsForAdmin(adminId: string): Promise<EventDocument[]> {
    const admin = await this.adminHierarchyCoreService.getAdminWithHierarchy(adminId);

    switch (admin.role) {
      case Role.SUPER_ADMIN:
        // Super admin sees all events
        return this.eventModel
          .find()
          .populate('createdBy', 'name email')
          .populate('availableStates', 'name')
          .populate('availableBranches', 'name location')
          .sort({ createdAt: -1 })
          .exec();

      case Role.STATE_ADMIN:
        // State admin sees events in their state
        return this.eventModel
          .find({
            $or: [
              { availableStates: admin.state }, // Events that include their state
              { createdBy: admin._id }, // Events they created
              {
                creatorLevel: 'branch_admin',
                availableBranches: {
                  $in: await this.adminHierarchyCoreService.getBranchIdsInState(admin.state.toString()),
                },
              }, // Events created by branch admins in their state
            ],
          })
          .populate('createdBy', 'name email')
          .populate('availableStates', 'name')
          .populate('availableBranches', 'name location')
          .sort({ createdAt: -1 })
          .exec();      case Role.BRANCH_ADMIN:
        // Branch admin sees events in their branch
        return this.eventModel
          .find({
            $or: [
              { availableBranches: admin.branch }, // Events that include their branch
              { createdBy: admin._id }, // Events they created
            ],
          })
          .populate('createdBy', 'name email')
          .populate('availableStates', 'name')
          .populate('availableBranches', 'name location')
          .sort({ createdAt: -1 })
          .exec();

      case Role.ZONAL_ADMIN:
        // Zonal admin sees events in their zone
        if (!admin.zone) {
          throw new BadRequestException('Zonal admin must be assigned to a zone');
        }
        return this.eventModel
          .find({
            $or: [
              { availableZones: admin.zone }, // Events that include their zone
              { createdBy: admin._id }, // Events they created
            ],
          })
          .populate('createdBy', 'name email')
          .populate('availableStates', 'name')
          .populate('availableBranches', 'name location')
          .populate('availableZones', 'name')
          .sort({ createdAt: -1 })
          .exec();

      default:
        return [];
    }
  }

  /**
   * Get admins accessible by requesting admin for export
   */
  async getAccessibleAdmins(adminId: string): Promise<UserDocument[]> {
    const admin = await this.adminHierarchyCoreService.getAdminWithHierarchy(adminId);
    let query: any = {
      role: {
        $in: [
          Role.STATE_ADMIN,
          Role.BRANCH_ADMIN,
          Role.ZONAL_ADMIN,
          Role.WORKER,
        ],
      },
    };

    // Filter based on requesting admin's jurisdiction
    switch (admin.role) {
      case Role.SUPER_ADMIN:
        // Can see all admins
        break;
      case Role.STATE_ADMIN:
        query.$or = [
          { role: Role.BRANCH_ADMIN, state: admin.state },
          { role: Role.ZONAL_ADMIN, state: admin.state },
          { role: Role.WORKER, state: admin.state },
        ];
        break;
      case Role.BRANCH_ADMIN:
        query.$or = [
          { role: Role.ZONAL_ADMIN, branch: admin.branch },
          { role: Role.WORKER, branch: admin.branch },
        ];
        break;
      default:
        // Other roles can't export admin data
        return [];
    }

    return await this.userModel
      .find(query)
      .populate('state', 'name')
      .populate('branch', 'name location')
      .populate('zone', 'name')
      .select('name email role state branch zone isActive lastLogin createdAt')
      .sort({ role: 1, name: 1 })
      .exec();
  }

  /**
   * Get workers accessible by admin with detailed information
   */  async getAccessibleWorkers(adminId: string): Promise<any[]> {
    const admin = await this.adminHierarchyCoreService.getAdminWithHierarchy(adminId);

    let query: any = {
      role: Role.WORKER,
    };

    // Filter based on requesting admin's jurisdiction
    switch (admin.role) {
      case Role.SUPER_ADMIN:
        // Can see all workers
        break;
      case Role.STATE_ADMIN:
        query.state = admin.state;
        break;
      case Role.BRANCH_ADMIN:
        query.branch = admin.branch;
        break;
      case Role.ZONAL_ADMIN:
        // Zonal admins can only see workers in their zone
        query.zone = admin.zone;
        break;
      default:
        // Other roles can't access worker data
        return [];
    }

    const workers = await this.userModel
      .find(query)
      .populate('state', 'name')
      .populate('branch', 'name location')
      .populate('zone', 'name')
      .populate('approvedBy', 'name')
      .select('name state branch zone isApproved approvedBy approvedAt isActive createdAt')
      .sort({ createdAt: -1 })
      .exec();    // Calculate actual guest counts for each worker
    const workersWithGuestCounts = await Promise.all(
      workers.map(async (worker) => {
        // Count total invited guests for this worker (using registeredBy field)
        const totalInvitedGuests = await this.guestModel.countDocuments({
          registeredBy: worker._id
        });

        // Count checked-in guests for this worker (using checkedIn field)
        const totalCheckedInGuests = await this.guestModel.countDocuments({
          registeredBy: worker._id,
          checkedIn: true
        });

        return {
          ...worker.toObject(),
          totalInvitedGuests,
          totalCheckedInGuests
        };
      })
    );

    return workersWithGuestCounts;
  }

  /**
   * Get guests accessible by admin with detailed information
   */
  async getAccessibleGuests(adminId: string): Promise<any[]> {
    const admin = await this.adminHierarchyCoreService.getAdminWithHierarchy(adminId);

    let query: any = {};

    // Filter based on requesting admin's jurisdiction
    switch (admin.role) {
      case Role.SUPER_ADMIN:
        // Can see all guests
        break;
      case Role.STATE_ADMIN:
        query.state = admin.state;
        break;
      case Role.BRANCH_ADMIN:
        query.branch = admin.branch;
        break;
      case Role.ZONAL_ADMIN:
        // Zonal admins can only see guests in their zone
        // First get workers in their zone, then filter guests by those workers
        const zoneWorkers = await this.userModel
          .find({ zone: admin.zone, role: Role.WORKER })
          .select('_id')
          .exec();
        const workerIds = zoneWorkers.map(worker => worker._id);
        query.registeredBy = { $in: workerIds };
        break;
      default:
        // Other roles can't access guest data
        return [];
    }    const guests = await this.guestModel
      .find(query)
      .populate('event', 'name')
      .populate('registeredBy', 'name')
      .populate('state', 'name')
      .populate('branch', 'name location')
      .populate('pickupStation', 'name location')      .select('name email phone transportPreference event registeredBy state branch pickupStation status checkedIn checkedInTime createdAt')
      .sort({ createdAt: -1 })
      .exec();

    return guests;
  }
}

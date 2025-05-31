import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { State, StateDocument } from '../schemas/state.schema';
import { Branch, BranchDocument } from '../schemas/branch.schema';
import { Event, EventDocument } from '../schemas/event.schema';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class AdminHierarchyService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(State.name) private stateModel: Model<StateDocument>,
    @InjectModel(Branch.name) private branchModel: Model<BranchDocument>,
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
  ) {}

  /**
   * Get admin user with hierarchy validation
   */
  async getAdminWithHierarchy(userId: string): Promise<UserDocument> {
    const admin = await this.userModel
      .findById(userId)
      .populate('state', 'name code')
      .populate('branch', 'name location stateId')
      .exec();

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    if (![Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN].includes(admin.role)) {
      throw new ForbiddenException('User is not an admin');
    }

    return admin;
  }

  /**
   * Validate if admin can access specific state
   */
  async canAccessState(adminId: string, stateId: string): Promise<boolean> {
    const admin = await this.getAdminWithHierarchy(adminId);

    switch (admin.role) {
      case Role.SUPER_ADMIN:
        return true; // Super admin can access all states
      case Role.STATE_ADMIN:
        return admin.state?.toString() === stateId;
      case Role.BRANCH_ADMIN:
        // Branch admin can access their state through their branch
        const branch = await this.branchModel.findById(admin.branch).exec();
        return branch?.stateId.toString() === stateId;
      default:
        return false;
    }
  }

  /**
   * Validate if admin can access specific branch
   */
  async canAccessBranch(adminId: string, branchId: string): Promise<boolean> {
    const admin = await this.getAdminWithHierarchy(adminId);

    switch (admin.role) {
      case Role.SUPER_ADMIN:
        return true; // Super admin can access all branches
      case Role.STATE_ADMIN:
        // State admin can access branches in their state
        const branch = await this.branchModel.findById(branchId).exec();
        return branch?.stateId.toString() === admin.state?.toString();
      case Role.BRANCH_ADMIN:
        return admin.branch?.toString() === branchId;
      default:
        return false;
    }
  }

  /**
   * Get states accessible by admin
   */
  async getAccessibleStates(adminId: string): Promise<StateDocument[]> {
    const admin = await this.getAdminWithHierarchy(adminId);

    switch (admin.role) {
      case Role.SUPER_ADMIN:
        return this.stateModel.find({ isActive: true }).exec();
      case Role.STATE_ADMIN:
        return this.stateModel.find({ _id: admin.state, isActive: true }).exec();
      case Role.BRANCH_ADMIN:
        const branch = await this.branchModel.findById(admin.branch).exec();
        return this.stateModel.find({ _id: branch?.stateId, isActive: true }).exec();
      default:
        return [];
    }
  }

  /**
   * Get branches accessible by admin
   */
  async getAccessibleBranches(adminId: string, stateId?: string): Promise<BranchDocument[]> {
    const admin = await this.getAdminWithHierarchy(adminId);

    switch (admin.role) {
      case Role.SUPER_ADMIN:
        const query = stateId ? { stateId: new Types.ObjectId(stateId), isActive: true } : { isActive: true };
        return this.branchModel.find(query).populate('stateId', 'name').exec();
      case Role.STATE_ADMIN:
        const stateQuery = { stateId: admin.state, isActive: true };
        return this.branchModel.find(stateQuery).populate('stateId', 'name').exec();
      case Role.BRANCH_ADMIN:
        return this.branchModel.find({ _id: admin.branch, isActive: true }).populate('stateId', 'name').exec();
      default:
        return [];
    }
  }

  /**
   * Get events visible to admin based on hierarchy
   */
  async getEventsForAdmin(adminId: string): Promise<EventDocument[]> {
    const admin = await this.getAdminWithHierarchy(adminId);

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
                  $in: await this.getBranchIdsInState(admin.state.toString()) 
                }
              } // Events created by branch admins in their state
            ]
          })
          .populate('createdBy', 'name email')
          .populate('availableStates', 'name')
          .populate('availableBranches', 'name location')
          .sort({ createdAt: -1 })
          .exec();

      case Role.BRANCH_ADMIN:
        // Branch admin sees events in their branch
        return this.eventModel
          .find({
            $or: [
              { availableBranches: admin.branch }, // Events that include their branch
              { createdBy: admin._id }, // Events they created
            ]
          })
          .populate('createdBy', 'name email')
          .populate('availableStates', 'name')
          .populate('availableBranches', 'name location')
          .sort({ createdAt: -1 })
          .exec();

      default:
        return [];
    }
  }
  /**
   * Helper method to get branch IDs in a state
   */
  private async getBranchIdsInState(stateId: string): Promise<Types.ObjectId[]> {
    const branches = await this.branchModel
      .find({ stateId: new Types.ObjectId(stateId), isActive: true })
      .select('_id')
      .exec();
    return branches.map(branch => branch._id as Types.ObjectId);
  }
}

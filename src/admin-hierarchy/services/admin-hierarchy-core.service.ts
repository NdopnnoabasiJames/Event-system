import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../../schemas/user.schema';
import { State, StateDocument } from '../../schemas/state.schema';
import { Branch, BranchDocument } from '../../schemas/branch.schema';
import { Zone, ZoneDocument } from '../../schemas/zone.schema';
import { Role } from '../../common/enums/role.enum';

/**
 * Core service for admin hierarchy validation and access control
 */
@Injectable()
export class AdminHierarchyCoreService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(State.name) private stateModel: Model<StateDocument>,
    @InjectModel(Branch.name) private branchModel: Model<BranchDocument>,
    @InjectModel(Zone.name) private zoneModel: Model<ZoneDocument>,
  ) {}

  /**
   * Get admin user with hierarchy validation
   */
  async getAdminWithHierarchy(userId: string): Promise<UserDocument> {
    const admin = await this.userModel
      .findById(userId)
      .populate('state', 'name code')
      .populate('branch', 'name location stateId')
      .populate('zone', 'name branchId')
      .exec();

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    if (
      ![
        Role.SUPER_ADMIN,
        Role.STATE_ADMIN,
        Role.BRANCH_ADMIN,
        Role.ZONAL_ADMIN,
      ].includes(admin.role)
    ) {
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
        return true;
      case Role.STATE_ADMIN:
        return admin.state._id.toString() === stateId;
      case Role.BRANCH_ADMIN:
        const branch = await this.branchModel.findById(admin.branch).exec();
        return branch?.stateId.toString() === stateId;
      case Role.ZONAL_ADMIN:
        const zone = await this.zoneModel
          .findById(admin.zone)
          .populate('branchId')
          .exec();
        const zoneBranch = zone?.branchId as any;
        return zoneBranch?.stateId?.toString() === stateId;
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
        return true;
      case Role.STATE_ADMIN:
        const branch = await this.branchModel.findById(branchId).exec();
        return branch?.stateId?.toString() === admin.state._id.toString();
      case Role.BRANCH_ADMIN:
        return admin.branch._id.toString() === branchId;
      case Role.ZONAL_ADMIN:
        const zone = await this.zoneModel.findById(admin.zone).exec();
        return zone?.branchId?.toString() === branchId;
      default:
        return false;
    }
  }

  /**
   * Validate if admin can access specific zone
   */
  async canAccessZone(adminId: string, zoneId: string): Promise<boolean> {
    const admin = await this.getAdminWithHierarchy(adminId);

    switch (admin.role) {
      case Role.SUPER_ADMIN:
        return true;
      case Role.STATE_ADMIN:
        const zone = await this.zoneModel
          .findById(zoneId)
          .populate('branchId')
          .exec();
        const zoneBranch = zone?.branchId as any;
        return zoneBranch?.stateId?.toString() === admin.state._id.toString();
      case Role.BRANCH_ADMIN:
        const zoneForBranch = await this.zoneModel.findById(zoneId).exec();
        return zoneForBranch?.branchId?.toString() === admin.branch._id.toString();
      case Role.ZONAL_ADMIN:
        return admin.zone._id.toString() === zoneId;
      default:
        return false;
    }
  }

  /**
   * Check if an admin can manage another admin based on hierarchy
   */
  canManageAdmin(managerRole: Role, targetRole: Role): boolean {
    const roleHierarchy = {
      [Role.SUPER_ADMIN]: 4,
      [Role.STATE_ADMIN]: 3,
      [Role.BRANCH_ADMIN]: 2,
      [Role.ZONAL_ADMIN]: 1,
    };

    return roleHierarchy[managerRole] > roleHierarchy[targetRole];
  }

  /**
   * Enhanced jurisdiction-based access control with admin status checking
   */
  async validateAdminAccess(
    adminId: string,
    requiredRole?: Role,
  ): Promise<UserDocument> {
    const admin = await this.getAdminWithHierarchy(adminId);

    // Check if admin is active
    if (!admin.isActive) {
      throw new ForbiddenException('Admin account is disabled');
    }

    // Check role if specified
    if (requiredRole && admin.role !== requiredRole) {
      throw new ForbiddenException('Insufficient role permissions');
    }

    return admin;
  }

  /**
   * Helper method to check if admin has jurisdiction assignment
   */
  async checkAdminJurisdictionAssignment(
    admin: UserDocument,
  ): Promise<boolean> {
    switch (admin.role) {
      case Role.STATE_ADMIN:
        return !!admin.state;
      case Role.BRANCH_ADMIN:
        return !!admin.branch;
      case Role.ZONAL_ADMIN:
        return !!admin.zone;
      default:
        return false;
    }
  }

  /**
   * Helper method to get branch IDs in a state
   */
  async getBranchIdsInState(
    stateId: string,
  ): Promise<Types.ObjectId[]> {
    const branches = await this.branchModel
      .find({ stateId: new Types.ObjectId(stateId), isActive: true })
      .select('_id')
      .exec();
    return branches.map((branch) => branch._id as Types.ObjectId);
  }
}

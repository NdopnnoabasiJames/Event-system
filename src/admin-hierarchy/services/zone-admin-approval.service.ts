import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../../schemas/user.schema';
import { Zone, ZoneDocument } from '../../schemas/zone.schema';
import { Role } from '../../common/enums/role.enum';
import { AdminHierarchyCoreService } from './admin-hierarchy-core.service';

/**
 * Service for zone admin approval workflow (Branch Admin functionality)
 */
@Injectable()
export class ZoneAdminApprovalService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Zone.name) private zoneModel: Model<ZoneDocument>,
    private adminHierarchyCoreService: AdminHierarchyCoreService,
  ) {}

  /**
   * Get pending zone admin registrations for a branch admin
   */
  async getPendingZoneAdminsByBranch(
    branchAdminId: string,
  ): Promise<UserDocument[]> {
    const admin = await this.adminHierarchyCoreService.getAdminWithHierarchy(branchAdminId);

    if (admin.role !== Role.BRANCH_ADMIN) {
      throw new ForbiddenException('Only branch admins can access this');
    }

    // Use the branch ObjectId and convert to string to match stored data
    const branchObjectId = admin.branch._id || admin.branch;
    const branchId = branchObjectId.toString();

    const results = await this.userModel
      .find({
        role: Role.ZONAL_ADMIN,
        isApproved: false,
        branch: branchId,
        isActive: true,
      })
      .populate('state', 'name')
      .populate('branch', 'name location')
      .populate('zone', 'name')
      .select('name email role state branch zone createdAt')
      .sort({ createdAt: -1 })
      .exec();

    return results;
  }

  /**
   * Get approved zone admins for a branch admin
   */
  async getApprovedZoneAdminsByBranch(
    branchAdminId: string,
  ): Promise<UserDocument[]> {
    const admin = await this.adminHierarchyCoreService.getAdminWithHierarchy(branchAdminId);

    if (admin.role !== Role.BRANCH_ADMIN) {
      throw new ForbiddenException('Only branch admins can access this');
    }

    // Use the branch ObjectId and convert to string to match stored data
    const branchObjectId = admin.branch._id || admin.branch;
    const branchId = branchObjectId.toString();

    const results = await this.userModel
      .find({
        role: Role.ZONAL_ADMIN,
        isApproved: true,
        branch: branchId,
        isActive: true,
      })
      .populate('state', 'name')
      .populate('branch', 'name location')
      .populate('zone', 'name')
      .populate('approvedBy', 'name email')
      .select(
        'name email role state branch zone approvedBy approvedAt createdAt isApproved',
      )
      .sort({ approvedAt: -1, createdAt: -1 })
      .exec();

    return results;
  }

  /**
   * Approve a zone admin registration
   */
  async approveZoneAdmin(
    zoneAdminId: string,
    branchAdminId: string,
    approvalData: any,
  ): Promise<UserDocument> {
    const branchAdmin = await this.adminHierarchyCoreService.getAdminWithHierarchy(branchAdminId);

    if (branchAdmin.role !== Role.BRANCH_ADMIN) {
      throw new ForbiddenException('Only branch admins can approve zone admins');
    }

    const zoneAdmin = await this.userModel.findById(zoneAdminId).exec();
    if (!zoneAdmin) {
      throw new NotFoundException('Zone admin not found');
    }

    if (zoneAdmin.role !== Role.ZONAL_ADMIN) {
      throw new BadRequestException('User is not a zonal admin');
    }

    if (zoneAdmin.isApproved) {
      throw new BadRequestException('Zone admin is already approved');
    }

    // Verify the zone admin belongs to the branch admin's branch
    const branchObjectId = branchAdmin.branch._id || branchAdmin.branch;
    const branchId = branchObjectId.toString();
    const zoneAdminBranchId = zoneAdmin.branch?.toString();

    if (zoneAdminBranchId !== branchId) {
      throw new ForbiddenException('Zone admin does not belong to your branch');
    }

    zoneAdmin.isApproved = true;
    zoneAdmin.approvedBy = new Types.ObjectId(branchAdminId);
    zoneAdmin.approvedAt = new Date();

    return zoneAdmin.save();
  }

  /**
   * Reject a zone admin registration
   */
  async rejectZoneAdmin(
    zoneAdminId: string,
    branchAdminId: string,
    reason: string,
  ): Promise<UserDocument> {
    const branchAdmin = await this.adminHierarchyCoreService.getAdminWithHierarchy(branchAdminId);

    if (branchAdmin.role !== Role.BRANCH_ADMIN) {
      throw new ForbiddenException('Only branch admins can reject zone admins');
    }

    const zoneAdmin = await this.userModel.findById(zoneAdminId).exec();
    if (!zoneAdmin) {
      throw new NotFoundException('Zone admin not found');
    }

    if (zoneAdmin.role !== Role.ZONAL_ADMIN) {
      throw new BadRequestException('User is not a zonal admin');
    }

    // Verify the zone admin belongs to the branch admin's branch
    const branchObjectId = branchAdmin.branch._id || branchAdmin.branch;
    const branchId = branchObjectId.toString();
    const zoneAdminBranchId = zoneAdmin.branch?.toString();

    if (zoneAdminBranchId !== branchId) {
      throw new ForbiddenException('Zone admin does not belong to your branch');
    }

    zoneAdmin.isApproved = false;
    zoneAdmin.isActive = false;
    zoneAdmin.rejectedBy = new Types.ObjectId(branchAdminId);
    zoneAdmin.rejectedAt = new Date();

    return zoneAdmin.save();
  }

  /**
   * Get zones managed by a branch admin
   */
  async getZonesByBranchAdmin(branchAdminId: string): Promise<ZoneDocument[]> {
    const admin = await this.adminHierarchyCoreService.getAdminWithHierarchy(branchAdminId);

    if (admin.role !== Role.BRANCH_ADMIN) {
      throw new ForbiddenException('Only branch admins can access this');
    }

    // Use the branch ObjectId instead of the populated object
    const branchId = admin.branch._id || admin.branch;

    return this.zoneModel
      .find({ branchId: branchId, isActive: true })
      .populate('branchId', 'name location')
      .sort({ name: 1 })
      .exec();
  }
}

import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../../schemas/user.schema';
import { Role } from '../../common/enums/role.enum';
import { AdminHierarchyCoreService } from './admin-hierarchy-core.service';
import {
  AdminReplacementDto,
  JurisdictionTransferDto,
  AdminReplacementResponseDto,
  JurisdictionTransferResponseDto,
} from '../dto/admin-jurisdiction.dto';
import { State, StateDocument } from '../../schemas/state.schema';
import { Branch, BranchDocument } from '../../schemas/branch.schema';
import { Zone, ZoneDocument } from '../../schemas/zone.schema';

/**
 * Service for managing admin lifecycle (enable/disable, replacement, jurisdiction transfer)
 */
@Injectable()
export class AdminManagementService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(State.name) private stateModel: Model<StateDocument>,
    @InjectModel(Branch.name) private branchModel: Model<BranchDocument>,
    @InjectModel(Zone.name) private zoneModel: Model<ZoneDocument>,
    private adminHierarchyCoreService: AdminHierarchyCoreService,
  ) {}

  /**
   * Disable an admin
   */
  async disableAdmin(
    adminId: string,
    disabledBy: string,
    reason?: string,
  ): Promise<UserDocument> {
    const admin = await this.userModel.findById(adminId).exec();
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const disablingAdmin = await this.adminHierarchyCoreService.getAdminWithHierarchy(disabledBy);

    // Validate hierarchy permissions
    if (!this.adminHierarchyCoreService.canManageAdmin(disablingAdmin.role, admin.role)) {
      throw new ForbiddenException(
        'Insufficient permissions to disable this admin',
      );
    }

    if (!admin.isActive) {
      throw new BadRequestException('Admin is already disabled');
    }

    admin.isActive = false;
    admin.disabledBy = new Types.ObjectId(disabledBy);
    admin.disabledAt = new Date();
    admin.disableReason = reason;

    return await admin.save();
  }

  /**
   * Enable an admin
   */
  async enableAdmin(adminId: string, enabledBy: string): Promise<UserDocument> {
    const admin = await this.userModel.findById(adminId).exec();
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const enablingAdmin = await this.adminHierarchyCoreService.getAdminWithHierarchy(enabledBy);

    // Validate hierarchy permissions
    if (!this.adminHierarchyCoreService.canManageAdmin(enablingAdmin.role, admin.role)) {
      throw new ForbiddenException(
        'Insufficient permissions to enable this admin',
      );
    }

    if (admin.isActive) {
      throw new BadRequestException('Admin is already active');
    }

    admin.isActive = true;
    admin.disabledBy = undefined;
    admin.disabledAt = undefined;
    admin.disableReason = undefined;
    admin.enabledBy = new Types.ObjectId(enabledBy);
    admin.enabledAt = new Date();

    return await admin.save();
  }

  /**
   * Replace an admin with another admin
   */
  async replaceAdmin(
    replacementDto: AdminReplacementDto,
    requestingAdminId: string,
  ): Promise<AdminReplacementResponseDto> {
    const requestingAdmin = await this.adminHierarchyCoreService.getAdminWithHierarchy(requestingAdminId);
    const currentAdmin = await this.userModel
      .findById(replacementDto.currentAdminId)
      .exec();
    const newAdmin = await this.userModel
      .findById(replacementDto.newAdminId)
      .exec();

    if (!currentAdmin) {
      throw new NotFoundException('Current admin not found');
    }

    if (!newAdmin) {
      throw new NotFoundException('New admin not found');
    }

    // Validate hierarchy permissions
    if (!this.adminHierarchyCoreService.canManageAdmin(requestingAdmin.role, currentAdmin.role)) {
      throw new ForbiddenException(
        'Insufficient permissions to replace this admin',
      );
    }

    // Validate new admin role compatibility
    if (newAdmin.role !== currentAdmin.role) {
      throw new BadRequestException(
        'New admin must have the same role as current admin',
      );
    }

    // Validate new admin is not already assigned to a jurisdiction
    const newAdminHasAssignment =
      await this.adminHierarchyCoreService.checkAdminJurisdictionAssignment(newAdmin);
    if (newAdminHasAssignment) {
      throw new BadRequestException(
        'New admin is already assigned to a jurisdiction',
      );
    }

    // Transfer jurisdiction assignments
    newAdmin.state = currentAdmin.state;
    newAdmin.branch = currentAdmin.branch;
    newAdmin.zone = currentAdmin.zone;
    newAdmin.isActive = true;

    // Disable current admin
    currentAdmin.isActive = false;
    currentAdmin.disabledBy = new Types.ObjectId(requestingAdminId);
    currentAdmin.disabledAt = new Date();
    currentAdmin.disableReason = replacementDto.reason || 'Admin replacement';
    currentAdmin.replacedBy = new Types.ObjectId(replacementDto.newAdminId);
    currentAdmin.replacementDate = new Date();

    // Clear current admin's jurisdiction
    currentAdmin.state = undefined;
    currentAdmin.branch = undefined;
    currentAdmin.zone = undefined;

    // Save changes
    await Promise.all([currentAdmin.save(), newAdmin.save()]);

    return {
      success: true,
      replacedAdmin: {
        id: currentAdmin._id.toString(),
        name: currentAdmin.name,
        email: currentAdmin.email,
        role: currentAdmin.role,
      },
      newAdmin: {
        id: newAdmin._id.toString(),
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role,
      },
      replacementDate: new Date(),
      reason: replacementDto.reason,
      notes: replacementDto.notes,
    };
  }

  /**
   * Transfer jurisdiction from one admin to another
   */
  async transferJurisdiction(
    transferDto: JurisdictionTransferDto,
    requestingAdminId: string,
  ): Promise<JurisdictionTransferResponseDto> {
    const requestingAdmin = await this.adminHierarchyCoreService.getAdminWithHierarchy(requestingAdminId);
    const fromAdmin = await this.userModel
      .findById(transferDto.fromAdminId)
      .exec();
    const toAdmin = await this.userModel.findById(transferDto.toAdminId).exec();

    if (!fromAdmin) {
      throw new NotFoundException('Source admin not found');
    }

    if (!toAdmin) {
      throw new NotFoundException('Target admin not found');
    }

    // Validate hierarchy permissions
    if (
      !this.adminHierarchyCoreService.canManageAdmin(requestingAdmin.role, fromAdmin.role) ||
      !this.adminHierarchyCoreService.canManageAdmin(requestingAdmin.role, toAdmin.role)
    ) {
      throw new ForbiddenException(
        'Insufficient permissions to transfer jurisdiction',
      );
    }

    // Validate admin roles match
    if (
      fromAdmin.role !== toAdmin.role ||
      fromAdmin.role !== transferDto.adminRole
    ) {
      throw new BadRequestException(
        'Admin roles must match for jurisdiction transfer',
      );
    }

    // Validate target admin doesn't already have jurisdiction
    const toAdminHasAssignment =
      await this.adminHierarchyCoreService.checkAdminJurisdictionAssignment(toAdmin);
    if (toAdminHasAssignment) {
      throw new BadRequestException(
        'Target admin already has jurisdiction assignment',
      );
    }

    // Perform jurisdiction transfer based on admin role
    const transferredJurisdiction: any = {};

    switch (transferDto.adminRole) {
      case Role.STATE_ADMIN:
        if (!transferDto.stateId) {
          throw new BadRequestException(
            'State ID required for state admin jurisdiction transfer',
          );
        }
        const state = await this.stateModel.findById(transferDto.stateId).exec();
        if (!state) {
          throw new NotFoundException('State not found');
        }
        toAdmin.state = new Types.ObjectId(transferDto.stateId);
        fromAdmin.state = undefined;
        transferredJurisdiction.stateId = transferDto.stateId;
        transferredJurisdiction.stateName = state.name;
        break;

      case Role.BRANCH_ADMIN:
        if (!transferDto.branchId) {
          throw new BadRequestException(
            'Branch ID required for branch admin jurisdiction transfer',
          );
        }
        const branch = await this.branchModel
          .findById(transferDto.branchId)
          .populate('stateId')
          .exec();
        if (!branch) {
          throw new NotFoundException('Branch not found');
        }
        toAdmin.branch = new Types.ObjectId(transferDto.branchId);
        toAdmin.state = new Types.ObjectId(
          (branch.stateId as any)._id || branch.stateId,
        );
        fromAdmin.branch = undefined;
        fromAdmin.state = undefined;
        transferredJurisdiction.branchId = transferDto.branchId;
        transferredJurisdiction.branchName = branch.name;
        transferredJurisdiction.stateId = (
          (branch.stateId as any)._id || branch.stateId
        ).toString();
        transferredJurisdiction.stateName = (branch.stateId as any).name;
        break;

      case Role.ZONAL_ADMIN:
        if (!transferDto.zoneId) {
          throw new BadRequestException(
            'Zone ID required for zonal admin jurisdiction transfer',
          );
        }
        const zone = await this.zoneModel
          .findById(transferDto.zoneId)
          .populate({
            path: 'branchId',
            populate: { path: 'stateId' },
          })
          .exec();
        if (!zone) {
          throw new NotFoundException('Zone not found');
        }        toAdmin.zone = new Types.ObjectId(transferDto.zoneId);
        toAdmin.branch = new Types.ObjectId(zone.branchId.toString());
        toAdmin.state = new Types.ObjectId((zone.branchId as any).stateId.toString());
        fromAdmin.zone = undefined;
        fromAdmin.branch = undefined;
        fromAdmin.state = undefined;
        transferredJurisdiction.zoneId = transferDto.zoneId;
        transferredJurisdiction.zoneName = zone.name;
        transferredJurisdiction.branchId = zone.branchId.toString();
        transferredJurisdiction.branchName = (zone.branchId as any).name;
        transferredJurisdiction.stateId = (zone.branchId as any).stateId.toString();
        transferredJurisdiction.stateName = (zone.branchId as any).stateId.name;
        break;

      default:
        throw new BadRequestException(
          'Invalid admin role for jurisdiction transfer',
        );
    }

    // Disable source admin
    fromAdmin.isActive = false;
    fromAdmin.disabledBy = new Types.ObjectId(requestingAdminId);
    fromAdmin.disabledAt = new Date();
    fromAdmin.disableReason = transferDto.reason || 'Jurisdiction transfer';

    // Activate target admin
    toAdmin.isActive = true;

    // Save changes
    await Promise.all([fromAdmin.save(), toAdmin.save()]);

    return {
      success: true,
      fromAdmin: {
        id: fromAdmin._id.toString(),
        name: fromAdmin.name,
        email: fromAdmin.email,
        role: fromAdmin.role,
      },
      toAdmin: {
        id: toAdmin._id.toString(),
        name: toAdmin.name,
        email: toAdmin.email,
        role: toAdmin.role,
      },
      transferredJurisdiction,
      transferDate: new Date(),
      reason: transferDto.reason,
      notes: transferDto.notes,
    };
  }

  /**
   * Get disabled admins in jurisdiction
   */
  async getDisabledAdmins(adminId: string): Promise<UserDocument[]> {
    const admin = await this.adminHierarchyCoreService.getAdminWithHierarchy(adminId);
    let query: any = {
      role: { $in: [Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN] },
      isActive: false,
    };

    // Filter based on jurisdiction
    switch (admin.role) {
      case Role.SUPER_ADMIN:
        // Can see all disabled admins
        break;
      case Role.STATE_ADMIN:
        query.$or = [
          { role: Role.BRANCH_ADMIN, state: admin.state },
          { role: Role.ZONAL_ADMIN, state: admin.state },
        ];
        break;
      case Role.BRANCH_ADMIN:
        query = {
          role: Role.ZONAL_ADMIN,
          branch: admin.branch,
          isActive: false,
        };
        break;
      default:
        throw new ForbiddenException(
          'Insufficient permissions to view disabled admins',
        );
    }

    return await this.userModel
      .find(query)
      .populate('state', 'name')
      .populate('branch', 'name location')
      .populate('zone', 'name')
      .populate('disabledBy', 'name email')
      .select(
        'name email role state branch zone disabledBy disabledAt disableReason',
      )
      .sort({ disabledAt: -1 })
      .exec();
  }
}

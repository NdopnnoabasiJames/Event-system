import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { State, StateDocument } from '../schemas/state.schema';
import { Branch, BranchDocument } from '../schemas/branch.schema';
import { Zone, ZoneDocument } from '../schemas/zone.schema';
import { Event, EventDocument } from '../schemas/event.schema';
import { Guest, GuestDocument } from '../schemas/guest.schema';
import { Role } from '../common/enums/role.enum';
import { 
  AdminReplacementDto, 
  JurisdictionTransferDto, 
  AdminReplacementResponseDto, 
  JurisdictionTransferResponseDto 
} from './dto/admin-jurisdiction.dto';

@Injectable()
export class AdminHierarchyService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(State.name) private stateModel: Model<StateDocument>,
    @InjectModel(Branch.name) private branchModel: Model<BranchDocument>,
    @InjectModel(Zone.name) private zoneModel: Model<ZoneDocument>,
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    @InjectModel(Guest.name) private guestModel: Model<GuestDocument>,
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

    if (![Role.SUPER_ADMIN, Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN].includes(admin.role)) {
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
      case Role.ZONAL_ADMIN:
        // Zonal admin can access their state through their zone->branch->state
        const zone = await this.zoneModel.findById(admin.zone).populate('branchId').exec();
        const zoneBranch = zone?.branchId as any;
        return zoneBranch?.stateId?.toString() === stateId;
      default:
        return false;
    }
  }  /**
   * Validate if admin can access specific branch
   */
  async canAccessBranch(adminId: string, branchId: string): Promise<boolean> {
    const admin = await this.getAdminWithHierarchy(adminId);
    const branch = await this.branchModel.findById(branchId);
    
    if (!branch) {
      return false;
    }

    switch (admin.role) {
      case Role.SUPER_ADMIN:
        return true; // Super admin can access all branches
      case Role.STATE_ADMIN:
        return admin.state.toString() === branch.stateId.toString();
      case Role.BRANCH_ADMIN:
        return admin.branch.toString() === branchId;
      case Role.ZONAL_ADMIN:
        // Zonal admin can access their branch
        return admin.branch.toString() === branchId;
      default:
        return false;
    }
  }

  /**
   * Validate if admin can access specific zone
   */
  async canAccessZone(adminId: string, zoneId: string): Promise<boolean> {
    const admin = await this.getAdminWithHierarchy(adminId);
    const zone = await this.zoneModel.findById(zoneId);
    
    if (!zone) {
      return false;
    }

    switch (admin.role) {
      case Role.SUPER_ADMIN:
        return true; // Super admin can access all zones
      case Role.STATE_ADMIN:
        // State admin can access zones in their state
        const branch = await this.branchModel.findById(zone.branchId);
        return branch && admin.state.toString() === branch.stateId.toString();
      case Role.BRANCH_ADMIN:
        return admin.branch.toString() === zone.branchId.toString();
      case Role.ZONAL_ADMIN:
        return admin.zone.toString() === zoneId;
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
      case Role.ZONAL_ADMIN:
        const zone = await this.zoneModel.findById(admin.zone).populate('branchId').exec();
        const zoneBranch = zone?.branchId as any;
        return this.stateModel.find({ _id: zoneBranch?.stateId, isActive: true }).exec();
      default:
        return [];
    }
  }  /**
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
      case Role.ZONAL_ADMIN:
        const zone = await this.zoneModel.findById(admin.zone).exec();
        return this.branchModel.find({ _id: zone?.branchId, isActive: true }).populate('stateId', 'name').exec();
      default:
        return [];
    }
  }

  /**
   * Get zones accessible by admin
   */
  async getAccessibleZones(adminId: string, branchId?: string): Promise<ZoneDocument[]> {
    const admin = await this.getAdminWithHierarchy(adminId);

    switch (admin.role) {
      case Role.SUPER_ADMIN:
        const query = branchId ? { branchId: new Types.ObjectId(branchId), isActive: true } : { isActive: true };
        return this.zoneModel.find(query).populate('branchId', 'name location').exec();
      case Role.STATE_ADMIN:
        // State admin can access zones in all branches within their state
        const branches = await this.branchModel.find({ stateId: admin.state, isActive: true }).select('_id');
        const branchIds = branches.map(branch => branch._id);
        return this.zoneModel.find({ branchId: { $in: branchIds }, isActive: true }).populate('branchId', 'name location').exec();
      case Role.BRANCH_ADMIN:
        return this.zoneModel.find({ branchId: admin.branch, isActive: true }).populate('branchId', 'name location').exec();
      case Role.ZONAL_ADMIN:
        return this.zoneModel.find({ _id: admin.zone, isActive: true }).populate('branchId', 'name location').exec();
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

  /**
   * Phase 2.1: Admin disable/enable functionality
   */
  async disableAdmin(adminId: string, disabledBy: string, reason?: string): Promise<UserDocument> {
    const admin = await this.userModel.findById(adminId).exec();
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const disablingAdmin = await this.getAdminWithHierarchy(disabledBy);

    // Validate hierarchy permissions
    if (!this.canManageAdmin(disablingAdmin.role, admin.role)) {
      throw new ForbiddenException('Insufficient permissions to disable this admin');
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

  async enableAdmin(adminId: string, enabledBy: string): Promise<UserDocument> {
    const admin = await this.userModel.findById(adminId).exec();
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const enablingAdmin = await this.getAdminWithHierarchy(enabledBy);

    // Validate hierarchy permissions
    if (!this.canManageAdmin(enablingAdmin.role, admin.role)) {
      throw new ForbiddenException('Insufficient permissions to enable this admin');
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
   * Check if an admin can manage another admin based on hierarchy
   */
  private canManageAdmin(managerRole: Role, targetRole: Role): boolean {
    const roleHierarchy = {
      [Role.SUPER_ADMIN]: 4,
      [Role.STATE_ADMIN]: 3,
      [Role.BRANCH_ADMIN]: 2,
      [Role.ZONAL_ADMIN]: 1
    };

    return roleHierarchy[managerRole] > roleHierarchy[targetRole];
  }

  /**
   * Phase 2.1: Performance rating calculation for marketers
   */
  async calculateMarketerPerformanceRating(marketerId: string): Promise<{ rating: number; metrics: any }> {
    const marketer = await this.userModel.findById(marketerId).exec();
    if (!marketer || marketer.role !== Role.WORKER) {
      throw new NotFoundException('Marketer not found');
    }

    // Get all attendees registered by this marketer
    const totalInvited = await this.guestModel.countDocuments({ registeredBy: marketerId });
    const totalCheckedIn = await this.guestModel.countDocuments({ 
      registeredBy: marketerId, 
      checkedIn: true 
    });

    // Calculate check-in rate
    const checkInRate = totalInvited > 0 ? (totalCheckedIn / totalInvited) : 0;

    // Calculate rating based on check-in rate (0-5 stars)
    let rating = 0;
    if (checkInRate >= 0.9) rating = 5;      // 90%+ = 5 stars
    else if (checkInRate >= 0.8) rating = 4; // 80-89% = 4 stars
    else if (checkInRate >= 0.7) rating = 3; // 70-79% = 3 stars
    else if (checkInRate >= 0.6) rating = 2; // 60-69% = 2 stars
    else if (checkInRate >= 0.5) rating = 1; // 50-59% = 1 star
    // Below 50% = 0 stars

    // Update marketer's performance data
    marketer.performanceRating = rating;
    marketer.totalInvitedGuests = totalInvited;
    marketer.totalCheckedInGuests = totalCheckedIn;
    await marketer.save();

    const metrics = {
      totalInvited,
      totalCheckedIn,
      checkInRate: Math.round(checkInRate * 100) / 100,
      rating,
      ratingText: this.getRatingText(rating)
    };

    return { rating, metrics };
  }

  private getRatingText(rating: number): string {
    switch (rating) {
      case 5: return 'Gold';
      case 4: return '4 Star';
      case 3: return '3 Star';
      case 2: return '2 Star';
      case 1: return '1 Star';
      default: return 'No Rating';
    }
  }

  /**
   * Get marketers performance summary for an admin's jurisdiction
   */
  async getMarketersPerformanceSummary(adminId: string): Promise<any[]> {
    const admin = await this.getAdminWithHierarchy(adminId);
    let query: any = { role: Role.WORKER, isActive: true };

    // Filter marketers based on admin's jurisdiction
    switch (admin.role) {
      case Role.SUPER_ADMIN:
        // Can see all marketers
        break;
      case Role.STATE_ADMIN:
        query.state = admin.state;
        break;
      case Role.BRANCH_ADMIN:
        query.branch = admin.branch;
        break;
      case Role.ZONAL_ADMIN:
        query.zone = admin.zone;
        break;
      default:
        throw new ForbiddenException('Insufficient permissions');
    }

    const marketers = await this.userModel
      .find(query)
      .populate('state', 'name')
      .populate('branch', 'name location')
      .populate('zone', 'name')
      .select('name email performanceRating totalInvitedAttendees totalCheckedInAttendees state branch zone')
      .sort({ performanceRating: -1, totalCheckedInAttendees: -1 })
      .exec();

    return marketers.map(marketer => ({
      id: marketer._id,
      name: marketer.name,
      email: marketer.email,
      rating: marketer.performanceRating,
      ratingText: this.getRatingText(marketer.performanceRating),
      totalInvited: marketer.totalInvitedGuests,
      totalCheckedIn: marketer.totalCheckedInGuests,
      checkInRate: marketer.totalInvitedGuests > 0 
        ? Math.round((marketer.totalCheckedInGuests / marketer.totalInvitedGuests) * 100) / 100 
        : 0,
      location: {
        state: marketer.state,
        branch: marketer.branch,
        zone: marketer.zone
      }
    }));
  }

  /**
   * Enhanced jurisdiction-based access control with admin status checking
   */
  async validateAdminAccess(adminId: string, requiredRole?: Role): Promise<UserDocument> {
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
   * Get disabled admins in jurisdiction
   */
  async getDisabledAdmins(adminId: string): Promise<UserDocument[]> {
    const admin = await this.getAdminWithHierarchy(adminId);
    let query: any = { 
      role: { $in: [Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN] },
      isActive: false 
    };

    // Filter based on jurisdiction
    switch (admin.role) {
      case Role.SUPER_ADMIN:
        // Can see all disabled admins
        break;
      case Role.STATE_ADMIN:
        query.$or = [
          { role: Role.BRANCH_ADMIN, state: admin.state },
          { role: Role.ZONAL_ADMIN, state: admin.state }
        ];
        break;
      case Role.BRANCH_ADMIN:
        query = { 
          role: Role.ZONAL_ADMIN, 
          branch: admin.branch,
          isActive: false 
        };
        break;
      default:
        throw new ForbiddenException('Insufficient permissions to view disabled admins');
    }

    return await this.userModel
      .find(query)
      .populate('state', 'name')
      .populate('branch', 'name location')
      .populate('zone', 'name')
      .populate('disabledBy', 'name email')
      .select('name email role state branch zone disabledBy disabledAt disableReason')
      .sort({ disabledAt: -1 })
      .exec();
  }

  /**
   * Phase 5.3: Admin Replacement functionality
   */
  async replaceAdmin(replacementDto: AdminReplacementDto, requestingAdminId: string): Promise<AdminReplacementResponseDto> {
    const requestingAdmin = await this.getAdminWithHierarchy(requestingAdminId);
    const currentAdmin = await this.userModel.findById(replacementDto.currentAdminId).exec();
    const newAdmin = await this.userModel.findById(replacementDto.newAdminId).exec();

    if (!currentAdmin) {
      throw new NotFoundException('Current admin not found');
    }

    if (!newAdmin) {
      throw new NotFoundException('New admin not found');
    }

    // Validate hierarchy permissions
    if (!this.canManageAdmin(requestingAdmin.role, currentAdmin.role)) {
      throw new ForbiddenException('Insufficient permissions to replace this admin');
    }

    // Validate new admin role compatibility
    if (newAdmin.role !== currentAdmin.role) {
      throw new BadRequestException('New admin must have the same role as current admin');
    }

    // Validate new admin is not already assigned to a jurisdiction
    const newAdminHasAssignment = await this.checkAdminJurisdictionAssignment(newAdmin);
    if (newAdminHasAssignment) {
      throw new BadRequestException('New admin is already assigned to a jurisdiction');
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
    await Promise.all([
      currentAdmin.save(),
      newAdmin.save()
    ]);

    return {
      success: true,
      replacedAdmin: {
        id: currentAdmin._id.toString(),
        name: currentAdmin.name,
        email: currentAdmin.email,
        role: currentAdmin.role
      },
      newAdmin: {
        id: newAdmin._id.toString(),
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role
      },
      replacementDate: new Date(),
      reason: replacementDto.reason,
      notes: replacementDto.notes
    };
  }

  /**
   * Phase 5.3: Jurisdiction Transfer functionality
   */
  async transferJurisdiction(transferDto: JurisdictionTransferDto, requestingAdminId: string): Promise<JurisdictionTransferResponseDto> {
    const requestingAdmin = await this.getAdminWithHierarchy(requestingAdminId);
    const fromAdmin = await this.userModel.findById(transferDto.fromAdminId).exec();
    const toAdmin = await this.userModel.findById(transferDto.toAdminId).exec();

    if (!fromAdmin) {
      throw new NotFoundException('Source admin not found');
    }

    if (!toAdmin) {
      throw new NotFoundException('Target admin not found');
    }

    // Validate hierarchy permissions
    if (!this.canManageAdmin(requestingAdmin.role, fromAdmin.role) || 
        !this.canManageAdmin(requestingAdmin.role, toAdmin.role)) {
      throw new ForbiddenException('Insufficient permissions to transfer jurisdiction');
    }

    // Validate admin roles match
    if (fromAdmin.role !== toAdmin.role || fromAdmin.role !== transferDto.adminRole) {
      throw new BadRequestException('Admin roles must match for jurisdiction transfer');
    }

    // Validate target admin doesn't already have jurisdiction
    const toAdminHasAssignment = await this.checkAdminJurisdictionAssignment(toAdmin);
    if (toAdminHasAssignment) {
      throw new BadRequestException('Target admin already has jurisdiction assignment');
    }

    // Perform jurisdiction transfer based on admin role
    const transferredJurisdiction: any = {};

    switch (transferDto.adminRole) {
      case Role.STATE_ADMIN:
        if (!transferDto.stateId) {
          throw new BadRequestException('State ID required for state admin jurisdiction transfer');
        }
        // Validate state exists and fromAdmin has access
        const state = await this.stateModel.findById(transferDto.stateId).exec();
        if (!state) {
          throw new BadRequestException('State not found');
        }
        if (fromAdmin.state?.toString() !== transferDto.stateId) {
          throw new BadRequestException('Source admin does not manage this state');
        }
        
        toAdmin.state = new Types.ObjectId(transferDto.stateId);
        fromAdmin.state = undefined;
        transferredJurisdiction.stateId = transferDto.stateId;
        transferredJurisdiction.stateName = state.name;
        break;

      case Role.BRANCH_ADMIN:
        if (!transferDto.branchId) {
          throw new BadRequestException('Branch ID required for branch admin jurisdiction transfer');
        }
        // Validate branch exists and fromAdmin has access
        const branch = await this.branchModel.findById(transferDto.branchId).populate('stateId').exec();
        if (!branch) {
          throw new BadRequestException('Branch not found');
        }
        if (fromAdmin.branch?.toString() !== transferDto.branchId) {
          throw new BadRequestException('Source admin does not manage this branch');
        }        toAdmin.branch = new Types.ObjectId(transferDto.branchId);
        toAdmin.state = new Types.ObjectId((branch.stateId as any)._id || branch.stateId);
        fromAdmin.branch = undefined;
        fromAdmin.state = undefined;
        transferredJurisdiction.branchId = transferDto.branchId;
        transferredJurisdiction.branchName = branch.name;
        transferredJurisdiction.stateId = ((branch.stateId as any)._id || branch.stateId).toString();
        transferredJurisdiction.stateName = (branch.stateId as any).name;
        break;

      case Role.ZONAL_ADMIN:
        if (!transferDto.zoneId) {
          throw new BadRequestException('Zone ID required for zonal admin jurisdiction transfer');
        }
        // Validate zone exists and fromAdmin has access
        const zone = await this.zoneModel.findById(transferDto.zoneId)
          .populate({
            path: 'branchId',
            populate: { path: 'stateId' }
          }).exec();
        if (!zone) {
          throw new BadRequestException('Zone not found');
        }
        if (fromAdmin.zone?.toString() !== transferDto.zoneId) {
          throw new BadRequestException('Source admin does not manage this zone');
        }        toAdmin.zone = new Types.ObjectId(transferDto.zoneId);
        toAdmin.branch = new Types.ObjectId((zone.branchId as any)._id || zone.branchId);
        toAdmin.state = new Types.ObjectId((zone.branchId as any).stateId._id || (zone.branchId as any).stateId);
        fromAdmin.zone = undefined;
        fromAdmin.branch = undefined;
        fromAdmin.state = undefined;
        transferredJurisdiction.zoneId = transferDto.zoneId;
        transferredJurisdiction.zoneName = zone.name;
        transferredJurisdiction.branchId = (zone.branchId as any)._id.toString();
        transferredJurisdiction.branchName = (zone.branchId as any).name;
        transferredJurisdiction.stateId = (zone.branchId as any).stateId._id.toString();
        transferredJurisdiction.stateName = (zone.branchId as any).stateId.name;
        break;

      default:
        throw new BadRequestException('Invalid admin role for jurisdiction transfer');
    }

    // Disable source admin
    fromAdmin.isActive = false;
    fromAdmin.disabledBy = new Types.ObjectId(requestingAdminId);
    fromAdmin.disabledAt = new Date();
    fromAdmin.disableReason = transferDto.reason || 'Jurisdiction transfer';

    // Activate target admin
    toAdmin.isActive = true;

    // Save changes
    await Promise.all([
      fromAdmin.save(),
      toAdmin.save()
    ]);

    return {
      success: true,
      fromAdmin: {
        id: fromAdmin._id.toString(),
        name: fromAdmin.name,
        email: fromAdmin.email,
        role: fromAdmin.role
      },
      toAdmin: {
        id: toAdmin._id.toString(),
        name: toAdmin.name,
        email: toAdmin.email,
        role: toAdmin.role
      },
      transferredJurisdiction,
      transferDate: new Date(),
      reason: transferDto.reason,
      notes: transferDto.notes
    };
  }

  /**
   * Helper method to check if admin has jurisdiction assignment
   */
  private async checkAdminJurisdictionAssignment(admin: UserDocument): Promise<boolean> {
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
   * Get admins accessible by requesting admin for export
   */
  async getAccessibleAdmins(adminId: string): Promise<UserDocument[]> {
    const admin = await this.getAdminWithHierarchy(adminId);
    let query: any = { 
      role: { $in: [Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN, Role.WORKER] }
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
          { role: Role.WORKER, state: admin.state }
        ];
        break;
      case Role.BRANCH_ADMIN:
        query.$or = [
          { role: Role.ZONAL_ADMIN, branch: admin.branch },
          { role: Role.WORKER, branch: admin.branch }
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
}

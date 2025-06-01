import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { State, StateDocument } from '../schemas/state.schema';
import { Branch, BranchDocument } from '../schemas/branch.schema';
import { Zone, ZoneDocument } from '../schemas/zone.schema';
import { Event, EventDocument } from '../schemas/event.schema';
import { Attendee, AttendeeDocument } from '../schemas/attendee.schema';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class AdminHierarchyService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(State.name) private stateModel: Model<StateDocument>,
    @InjectModel(Branch.name) private branchModel: Model<BranchDocument>,
    @InjectModel(Zone.name) private zoneModel: Model<ZoneDocument>,
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    @InjectModel(Attendee.name) private attendeeModel: Model<AttendeeDocument>,
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
    if (!marketer || marketer.role !== Role.MARKETER) {
      throw new NotFoundException('Marketer not found');
    }

    // Get all attendees registered by this marketer
    const totalInvited = await this.attendeeModel.countDocuments({ registeredBy: marketerId });
    const totalCheckedIn = await this.attendeeModel.countDocuments({ 
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
    marketer.totalInvitedAttendees = totalInvited;
    marketer.totalCheckedInAttendees = totalCheckedIn;
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
    let query: any = { role: Role.MARKETER, isActive: true };

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
      totalInvited: marketer.totalInvitedAttendees,
      totalCheckedIn: marketer.totalCheckedInAttendees,
      checkInRate: marketer.totalInvitedAttendees > 0 
        ? Math.round((marketer.totalCheckedInAttendees / marketer.totalInvitedAttendees) * 100) / 100 
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
}

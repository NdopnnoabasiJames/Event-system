import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Event, EventDocument } from '../../schemas/event.schema';
import { User, UserDocument } from '../../schemas/user.schema';
import { Branch, BranchDocument } from '../../schemas/branch.schema';
import { Zone, ZoneDocument } from '../../schemas/zone.schema';
import { Role } from '../../common/enums/role.enum';
import { 
  CascadeStatus, 
  ParticipationOptions, 
  StatusTimelineEntry, 
  EventCascadeFlow 
} from '../interfaces/event-management.interfaces';



@Injectable()
export class HierarchicalEventManagementService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Branch.name) private branchModel: Model<BranchDocument>,
    @InjectModel(Zone.name) private zoneModel: Model<ZoneDocument>,
  ) {}

  /**
   * Get cascade status for an event showing progression through hierarchy
   */
  async getEventCascadeStatus(eventId: string, adminId: string): Promise<CascadeStatus> {
    const admin = await this.userModel.findById(adminId);
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const event = await this.eventModel.findById(eventId)
      .populate('createdBy', 'name role')
      .populate('selectedBranches', 'name')
      .populate('selectedZones', 'name');

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Check if admin has access to this event
    await this.validateEventAccess(event, admin);

    const cascadeStatus: CascadeStatus = {
      eventId: event._id.toString(),
      currentLevel: this.determineCurrentLevel(event),
      completedSteps: this.getCompletedSteps(event),
      pendingSteps: this.getPendingSteps(event),
      participationStatus: this.getAdminParticipationStatus(event, admin),
    };

    // Add hierarchy-specific details
    if (event.scope === 'national' || event.scope === 'state') {
      const totalBranches = await this.branchModel.countDocuments({
        state: { $in: event.scope === 'national' ? [] : [admin.state] }
      });
      cascadeStatus.totalBranches = totalBranches;
      cascadeStatus.selectedBranches = event.selectedBranches?.length || 0;
    }

    if (event.selectedBranches?.length > 0) {
      const totalZones = await this.zoneModel.countDocuments({
        branch: { $in: event.selectedBranches }
      });
      cascadeStatus.totalZones = totalZones;
      cascadeStatus.selectedZones = event.selectedZones?.length || 0;
    }

    cascadeStatus.nextLevel = this.getNextLevel(cascadeStatus.currentLevel);

    return cascadeStatus;
  }

  /**
   * Get participation options for an admin regarding a specific event
   */
  async getEventParticipationOptions(eventId: string, adminId: string): Promise<ParticipationOptions> {
    const admin = await this.userModel.findById(adminId);
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const event = await this.eventModel.findById(eventId);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    await this.validateEventAccess(event, admin);

    const options: ParticipationOptions = {
      eventId: event._id.toString(),
      adminRole: admin.role,
      canParticipate: this.canAdminParticipateInEvent(event, admin),
      currentStatus: this.getAdminParticipationStatus(event, admin),
      deadline: event.registrationDeadline,
      requirements: this.getParticipationRequirements(event, admin),
    };

    return options;
  }

  /**
   * Update admin's participation status for an event
   */
  async updateParticipationStatus(
    eventId: string,
    adminId: string,
    status: 'participating' | 'not_participating' | 'pending',
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    const admin = await this.userModel.findById(adminId);
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const event = await this.eventModel.findById(eventId);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    await this.validateEventAccess(event, admin);

    if (!this.canAdminParticipateInEvent(event, admin)) {
      throw new UnauthorizedException('Admin cannot participate in this event');
    }

    // Initialize participation tracking if not exists
    if (!event.participationTracking) {
      event.participationTracking = [];
    }    // Update or add participation status
    const existingIndex = event.participationTracking.findIndex(
      p => p.userId.toString() === adminId
    );    const participationEntry = {
      userId: new Types.ObjectId(adminId),
      status: status,
      updatedAt: new Date(),
      confirmedBy: new Types.ObjectId(adminId),
    };

    if (existingIndex >= 0) {
      event.participationTracking[existingIndex] = participationEntry;
    } else {
      event.participationTracking.push(participationEntry);
    }

    // Add to status timeline
    if (!event.statusTimeline) {
      event.statusTimeline = [];
    }    event.statusTimeline.push({
      timestamp: new Date(),
      status: `participation_${status}`,
      updatedBy: new Types.ObjectId(adminId),
      details: { 
        reason: reason,
        previousStatus: existingIndex >= 0 ? event.participationTracking[existingIndex].status : 'none',
        adminName: admin.name
      }
    });

    await event.save();

    return {
      success: true,
      message: `Participation status updated to ${status}`
    };
  }
  /**
   * Get event status timeline showing all status changes
   */
  async getEventStatusTimeline(eventId: string, adminId: string): Promise<StatusTimelineEntry[]> {
    const admin = await this.userModel.findById(adminId);
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const event = await this.eventModel.findById(eventId)
      .populate('statusTimeline.updatedBy', 'name');
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    await this.validateEventAccess(event, admin);

    // Transform schema structure to match interface
    return (event.statusTimeline || []).map(entry => ({
      timestamp: entry.timestamp,
      status: entry.status,
      adminId: entry.updatedBy._id?.toString() || entry.updatedBy.toString(),
      adminName: entry.details?.adminName || (entry.updatedBy as any)?.name || 'Unknown',
      reason: entry.details?.reason,
      details: entry.details,
    }));
  }

  /**
   * Update event status (draft, published, in_progress, completed, cancelled)
   */
  async updateEventStatus(
    eventId: string,
    adminId: string,
    status: 'draft' | 'published' | 'in_progress' | 'completed' | 'cancelled',
    statusReason?: string
  ): Promise<EventDocument> {
    const admin = await this.userModel.findById(adminId);
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const event = await this.eventModel.findById(eventId);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Validate admin can update this event
    if (!this.canAdminUpdateEvent(event, admin)) {
      throw new UnauthorizedException('Admin cannot update this event');
    }

    const previousStatus = event.status;
    event.status = status;

    // Add to status timeline
    if (!event.statusTimeline) {
      event.statusTimeline = [];
    }    event.statusTimeline.push({
      timestamp: new Date(),
      status: status,
      updatedBy: new Types.ObjectId(adminId),
      details: { 
        reason: statusReason,
        previousStatus,
        adminName: admin.name
      }
    });

    await event.save();
    return event;
  }

  /**
   * Get events by status with optional filter for subordinate events
   */
  async getEventsByStatus(
    adminId: string,
    status: string,
    includeSubordinateEvents: boolean = false
  ): Promise<EventDocument[]> {
    const admin = await this.userModel.findById(adminId);
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    let query: any = { status };

    // Apply hierarchy-based filtering
    if (admin.role === Role.STATE_ADMIN) {
      if (includeSubordinateEvents) {
        query.$or = [
          { createdBy: adminId },
          { scope: 'national' },
          { selectedBranches: { $in: await this.getAdminBranches(adminId) } }
        ];
      } else {
        query.createdBy = adminId;
      }
    } else if (admin.role === Role.BRANCH_ADMIN) {
      if (includeSubordinateEvents) {
        query.$or = [
          { createdBy: adminId },
          { selectedBranches: admin.branch },
          { selectedZones: { $in: await this.getAdminZones(adminId) } }
        ];
      } else {
        query.createdBy = adminId;
      }
    } else if (admin.role === Role.ZONAL_ADMIN) {
      query.selectedZones = admin.zone;
    }

    return this.eventModel.find(query)
      .populate('createdBy', 'name role')
      .populate('selectedBranches', 'name')
      .populate('selectedZones', 'name')
      .sort({ createdAt: -1 });
  }

  /**
   * Get events pending participation decision from admin
   */
  async getEventsPendingParticipation(adminId: string): Promise<EventDocument[]> {
    const admin = await this.userModel.findById(adminId);
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    let query: any = {
      status: { $in: ['published', 'in_progress'] },
      registrationDeadline: { $gte: new Date() },
      $or: []
    };

    // Build query based on admin role
    if (admin.role === Role.STATE_ADMIN) {
      query.$or.push({ scope: 'national' });
    } else if (admin.role === Role.BRANCH_ADMIN) {
      query.$or.push(
        { selectedBranches: admin.branch },
        { scope: 'state', createdBy: { $ne: adminId } }
      );
    } else if (admin.role === Role.ZONAL_ADMIN) {
      query.$or.push({ selectedZones: admin.zone });
    }

    const events = await this.eventModel.find(query);    // Filter out events where admin already made participation decision
    return events.filter(event => {
      const participation = event.participationTracking?.find(
        p => p.userId.toString() === adminId
      );
      return !participation || participation.status === 'pending';
    });
  }
  /**
   * Get complete cascade flow for an event showing all levels
   */
  async getEventCascadeFlow(eventId: string, adminId: string): Promise<EventCascadeFlow> {
    const admin = await this.userModel.findById(adminId);
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }    const event = await this.eventModel.findById(eventId)
      .populate({
        path: 'createdBy',
        select: 'name role state branch zone'
      })
      .populate('selectedBranches', 'name state')
      .populate('selectedZones', 'name branch');

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    await this.validateEventAccess(event, admin);    const creator = event.createdBy as any;
    const flow = {
      eventId: event._id.toString(),
      eventName: event.name,
      scope: event.scope,
      creator: {
        id: creator._id?.toString() || creator.toString(),
        name: creator.name || 'Unknown',
        role: creator.role || 'Unknown',
      },
      levels: [
        {
          level: 'super_admin',
          status: event.scope === 'national' ? 'completed' : 'not_applicable',
          admins: event.scope === 'national' ? [event.createdBy] : [],
        },
        {
          level: 'state_admin',
          status: this.getStateAdminStatus(event),
          admins: await this.getStateAdminsForEvent(event),
          branches: {
            total: await this.getTotalBranchesForEvent(event),
            selected: event.selectedBranches?.length || 0,
            details: event.selectedBranches || [],
          },
        },
        {
          level: 'branch_admin',
          status: this.getBranchAdminStatus(event),
          admins: await this.getBranchAdminsForEvent(event),
          zones: {
            total: await this.getTotalZonesForEvent(event),
            selected: event.selectedZones?.length || 0,
            details: event.selectedZones || [],
          },
        },
        {
          level: 'zonal_admin',
          status: this.getZonalAdminStatus(event),
          admins: await this.getZonalAdminsForEvent(event),
        },
      ],
      participationSummary: this.getParticipationSummary(event),
    };

    return flow;
  }

  // Helper methods
  private determineCurrentLevel(event: EventDocument): 'super_admin' | 'state_admin' | 'branch_admin' | 'zonal_admin' {
    if (event.scope === 'national' && (!event.selectedBranches || event.selectedBranches.length === 0)) {
      return 'super_admin';
    }
    if (event.selectedBranches && event.selectedBranches.length > 0 && (!event.selectedZones || event.selectedZones.length === 0)) {
      return 'state_admin';
    }
    if (event.selectedZones && event.selectedZones.length > 0) {
      return 'branch_admin';
    }
    return 'zonal_admin';
  }

  private getCompletedSteps(event: EventDocument): string[] {
    const steps = ['event_created'];
    if (event.selectedBranches && event.selectedBranches.length > 0) {
      steps.push('branches_selected');
    }
    if (event.selectedZones && event.selectedZones.length > 0) {
      steps.push('zones_selected');
    }
    if (event.status === 'published') {
      steps.push('event_published');
    }
    return steps;
  }

  private getPendingSteps(event: EventDocument): string[] {
    const steps = [];
    if (event.scope !== 'zonal' && (!event.selectedBranches || event.selectedBranches.length === 0)) {
      steps.push('branch_selection');
    }
    if (event.selectedBranches && event.selectedBranches.length > 0 && (!event.selectedZones || event.selectedZones.length === 0)) {
      steps.push('zone_selection');
    }
    if (event.status === 'draft') {
      steps.push('event_publication');
    }
    return steps;
  }

  private getNextLevel(currentLevel: string): string | undefined {
    const levels = ['super_admin', 'state_admin', 'branch_admin', 'zonal_admin'];
    const currentIndex = levels.indexOf(currentLevel);
    return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : undefined;
  }
  private getAdminParticipationStatus(event: EventDocument, admin: UserDocument): 'pending' | 'participating' | 'not_participating' {
    const participation = event.participationTracking?.find(
      p => p.userId.toString() === admin._id.toString()
    );
    const status = participation?.status || 'pending';
    
    // Ensure the returned status matches the expected enum values
    if (['pending', 'participating', 'not_participating'].includes(status)) {
      return status as 'pending' | 'participating' | 'not_participating';
    }
    return 'pending';
  }

  private canAdminParticipateInEvent(event: EventDocument, admin: UserDocument): boolean {
    // Logic to determine if admin can participate based on hierarchy and event scope
    if (event.scope === 'national' && admin.role === Role.STATE_ADMIN) return true;
    if (event.selectedBranches?.includes(admin.branch) && admin.role === Role.BRANCH_ADMIN) return true;
    if (event.selectedZones?.includes(admin.zone) && admin.role === Role.ZONAL_ADMIN) return true;
    return false;
  }

  private getParticipationRequirements(event: EventDocument, admin: UserDocument): string[] {
    const requirements = [];
    if (event.registrationDeadline) {
      requirements.push(`Registration deadline: ${event.registrationDeadline.toISOString()}`);
    }
    // Add more requirements based on event type and admin role
    return requirements;
  }

  private canAdminUpdateEvent(event: EventDocument, admin: UserDocument): boolean {
    return event.createdBy.toString() === admin._id.toString() || admin.role === Role.SUPER_ADMIN;
  }

  private async validateEventAccess(event: EventDocument, admin: UserDocument): Promise<void> {
    // Implement access validation logic based on hierarchy
    // This is a simplified version - expand based on your business rules
    if (admin.role === Role.SUPER_ADMIN) return;
    
    if (admin.role === Role.STATE_ADMIN) {
      if (event.scope === 'national' || event.createdBy.toString() === admin._id.toString()) return;
    }
    
    if (admin.role === Role.BRANCH_ADMIN) {
      if (event.selectedBranches?.includes(admin.branch) || event.createdBy.toString() === admin._id.toString()) return;
    }
    
    if (admin.role === Role.ZONAL_ADMIN) {
      if (event.selectedZones?.includes(admin.zone)) return;
    }
    
    throw new UnauthorizedException('Access denied to this event');
  }

  private async getAdminBranches(adminId: string): Promise<string[]> {
    const admin = await this.userModel.findById(adminId);
    if (admin?.role === Role.STATE_ADMIN) {
      const branches = await this.branchModel.find({ state: admin.state });
      return branches.map(b => b._id.toString());
    }
    return [];
  }

  private async getAdminZones(adminId: string): Promise<string[]> {
    const admin = await this.userModel.findById(adminId);
    if (admin?.role === Role.BRANCH_ADMIN) {
      const zones = await this.zoneModel.find({ branch: admin.branch });
      return zones.map(z => z._id.toString());
    }
    return [];
  }

  private getStateAdminStatus(event: EventDocument): string {
    if (event.scope === 'zonal' || event.scope === 'branch') return 'not_applicable';
    if (event.selectedBranches && event.selectedBranches.length > 0) return 'completed';
    return 'pending';
  }

  private getBranchAdminStatus(event: EventDocument): string {
    if (event.scope === 'zonal') return 'not_applicable';
    if (!event.selectedBranches || event.selectedBranches.length === 0) return 'waiting';
    if (event.selectedZones && event.selectedZones.length > 0) return 'completed';
    return 'pending';
  }

  private getZonalAdminStatus(event: EventDocument): string {
    if (!event.selectedZones || event.selectedZones.length === 0) return 'waiting';
    return 'active';
  }

  private async getStateAdminsForEvent(event: EventDocument): Promise<any[]> {
    // Implementation to get state admins involved in the event
    return [];
  }

  private async getBranchAdminsForEvent(event: EventDocument): Promise<any[]> {
    // Implementation to get branch admins involved in the event
    return [];
  }

  private async getZonalAdminsForEvent(event: EventDocument): Promise<any[]> {
    // Implementation to get zonal admins involved in the event
    return [];
  }

  private async getTotalBranchesForEvent(event: EventDocument): Promise<number> {
    if (event.scope === 'national') {
      return this.branchModel.countDocuments();
    }
    return 0;
  }

  private async getTotalZonesForEvent(event: EventDocument): Promise<number> {
    if (event.selectedBranches && event.selectedBranches.length > 0) {
      return this.zoneModel.countDocuments({ branch: { $in: event.selectedBranches } });
    }
    return 0;
  }

  private getParticipationSummary(event: EventDocument): any {
    const summary = {
      total: event.participationTracking?.length || 0,
      participating: 0,
      not_participating: 0,
      pending: 0,
    };

    event.participationTracking?.forEach(p => {
      summary[p.status]++;
    });

    return summary;
  }
}

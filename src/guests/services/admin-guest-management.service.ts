import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Guest, GuestDocument } from '../../schemas/guest.schema';
import { User, UserDocument } from '../../schemas/user.schema';
import { Event, EventDocument } from '../../schemas/event.schema';
import { Role } from '../../common/enums/role.enum';
import { AdminHierarchyService } from '../../admin-hierarchy/admin-hierarchy.service';
import { GuestValidationService } from './guest-validation.service';

export interface AdminGuestFilters {
  eventId?: string;
  workerId?: string;
  transportPreference?: 'bus' | 'private';
  status?: string;
  checkedIn?: boolean;
  search?: string;
  stateId?: string;
  branchId?: string;
  zoneId?: string;
  pickupStationId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  sortBy?: 'name' | 'registeredAt' | 'checkedInTime' | 'status';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface BulkGuestOperation {
  guestIds: string[];
  operation: 'update' | 'delete' | 'status_change' | 'assign_pickup';
  data?: any;
}

@Injectable()
export class AdminGuestManagementService {
  constructor(
    @InjectModel(Guest.name) private guestModel: Model<GuestDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    private adminHierarchyService: AdminHierarchyService,
    private guestValidationService: GuestValidationService,
  ) {}

  /**
   * Get guests with advanced filtering for admins
   */
  async getGuestsWithAdvancedFilters(
    adminId: string, 
    filters: AdminGuestFilters
  ): Promise<{
    guests: GuestDocument[];
    total: number;
    page: number;
    totalPages: number;
    summary: {
      totalGuests: number;
      checkedInGuests: number;
      busPreference: number;
      privatePreference: number;
      statusBreakdown: Record<string, number>;
    };
  }> {
    const admin = await this.adminHierarchyService.getAdminWithHierarchy(adminId);
    
    // Build query based on admin jurisdiction
    const baseQuery = await this.buildJurisdictionQuery(admin);
    const query = this.buildAdvancedQuery(baseQuery, filters);

    // Apply search
    if (filters.search) {
      const searchRegex = new RegExp(filters.search, 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex }
      ];
    }

    // Pagination
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 10, 100); // Max 100 per page
    const skip = (page - 1) * limit;

    // Get total count
    const total = await this.guestModel.countDocuments(query);

    // Build sort
    const sort: any = {};
    if (filters.sortBy) {
      const sortField = filters.sortBy === 'registeredAt' ? 'createdAt' : filters.sortBy;
      sort[sortField] = filters.sortOrder === 'desc' ? -1 : 1;
    } else {
      sort.createdAt = -1; // Default sort by newest
    }

    // Execute query
    const guests = await this.guestModel
      .find(query)
      .populate('event', 'name date location')
      .populate('registeredBy', 'name email role')
      .populate('checkedInBy', 'name email')
      .populate('pickupStation', 'location capacity')
      .populate('state', 'name')
      .populate('branch', 'name location')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .exec();

    // Generate summary
    const allGuests = await this.guestModel.find(baseQuery);
    const summary = this.generateGuestSummary(allGuests);

    return {
      guests,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      summary
    };
  }

  /**
   * Bulk guest operations for admins
   */
  async bulkGuestOperation(
    adminId: string,
    operation: BulkGuestOperation
  ): Promise<{ success: boolean; processed: number; errors: string[] }> {
    const admin = await this.adminHierarchyService.getAdminWithHierarchy(adminId);
    const errors: string[] = [];
    let processed = 0;

    // Validate admin can access these guests
    const guests = await this.guestModel.find({
      _id: { $in: operation.guestIds }
    });

    for (const guest of guests) {
      try {
        const canAccess = await this.canAdminAccessGuest(admin, guest);
        if (!canAccess) {
          errors.push(`No access to guest ${guest.name} (${guest._id})`);
          continue;
        }

        switch (operation.operation) {
          case 'update':
            await this.guestModel.findByIdAndUpdate(guest._id, operation.data);
            break;
          case 'delete':
            if (guest.checkedIn) {
              errors.push(`Cannot delete checked-in guest ${guest.name}`);
              continue;
            }
            await this.guestModel.findByIdAndDelete(guest._id);
            break;
          case 'status_change':
            await this.updateGuestStatus(guest._id.toString(), operation.data.status);
            break;
          case 'assign_pickup':
            await this.guestModel.findByIdAndUpdate(guest._id, {
              pickupStation: operation.data.pickupStationId
            });
            break;
        }
        processed++;
      } catch (error) {
        errors.push(`Error processing guest ${guest.name}: ${error.message}`);
      }
    }

    return { success: errors.length === 0, processed, errors };
  }

  /**
   * Guest data export for admins
   */
  async exportGuestData(
    adminId: string,
    filters: AdminGuestFilters
  ): Promise<any[]> {
    const admin = await this.adminHierarchyService.getAdminWithHierarchy(adminId);
    const baseQuery = await this.buildJurisdictionQuery(admin);
    const query = this.buildAdvancedQuery(baseQuery, filters);

    const guests = await this.guestModel
      .find(query)
      .populate('event', 'name date location')
      .populate('registeredBy', 'name email')
      .populate('checkedInBy', 'name email')
      .populate('pickupStation', 'location')
      .populate('state', 'name')
      .populate('branch', 'name')
      .sort({ createdAt: -1 })
      .exec();

    return guests.map(guest => ({
      name: guest.name,
      email: guest.email || '',
      phone: guest.phone,
      transportPreference: guest.transportPreference,
      status: guest.status,
      checkedIn: guest.checkedIn,
      eventName: (guest.event as any)?.name || '',
      eventDate: (guest.event as any)?.date || '',
      registeredBy: (guest.registeredBy as any)?.name || '',
      checkedInBy: (guest.checkedInBy as any)?.name || '',
      checkedInTime: guest.checkedInTime || '',
      pickupStation: (guest.pickupStation as any)?.location || '',
      state: (guest.state as any)?.name || '',
      branch: (guest.branch as any)?.name || '',
      registeredAt: (guest as any).createdAt
    }));
  }

  /**
   * Update guest status with validation
   */
  async updateGuestStatus(guestId: string, newStatus: string): Promise<GuestDocument> {
    const guest = await this.guestModel.findById(guestId);
    if (!guest) {
      throw new NotFoundException('Guest not found');
    }

    // Validate status transition
    const isValidTransition = this.guestValidationService.validateStatusTransition(
      guest.status as any,
      newStatus as any
    );

    if (!isValidTransition) {
      throw new BadRequestException(`Cannot change status from ${guest.status} to ${newStatus}`);
    }

    // Update status and related fields
    const updateData: any = { status: newStatus };
    
    if (newStatus === 'checked_in') {
      updateData.checkedIn = true;
      updateData.checkedInTime = new Date();
    } else if (newStatus === 'no_show') {
      updateData.checkedIn = false;
    }

    return await this.guestModel.findByIdAndUpdate(guestId, updateData, { new: true });
  }

  /**
   * Build jurisdiction-based query for admin
   */
  private async buildJurisdictionQuery(admin: UserDocument): Promise<any> {
    const query: any = {};

    switch (admin.role) {
      case Role.SUPER_ADMIN:
        // Super admin can see all guests
        break;
      case Role.STATE_ADMIN:
        query.state = admin.state;
        break;
      case Role.BRANCH_ADMIN:
        query.branch = admin.branch;
        break;      case Role.ZONAL_ADMIN:
        // Get all branches accessible to this zonal admin
        const branches = await this.adminHierarchyService.getAccessibleBranches(admin._id.toString());
        if (branches && branches.length > 0) {
          query.branch = { $in: branches.map(b => b._id) };
        }
        break;
    }

    return query;
  }

  /**
   * Build advanced query with filters
   */
  private buildAdvancedQuery(baseQuery: any, filters: AdminGuestFilters): any {
    const query = { ...baseQuery };

    if (filters.eventId) query.event = filters.eventId;
    if (filters.workerId) query.registeredBy = filters.workerId;
    if (filters.transportPreference) query.transportPreference = filters.transportPreference;
    if (filters.status) query.status = filters.status;
    if (filters.checkedIn !== undefined) query.checkedIn = filters.checkedIn;
    if (filters.stateId) query.state = filters.stateId;
    if (filters.branchId) query.branch = filters.branchId;
    if (filters.pickupStationId) query.pickupStation = filters.pickupStationId;

    // Date range filter
    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) query.createdAt.$gte = filters.dateFrom;
      if (filters.dateTo) query.createdAt.$lte = filters.dateTo;
    }

    return query;
  }

  /**
   * Check if admin can access specific guest
   */
  private async canAdminAccessGuest(admin: UserDocument, guest: GuestDocument): Promise<boolean> {
    switch (admin.role) {
      case Role.SUPER_ADMIN:
        return true;
      case Role.STATE_ADMIN:
        return guest.state.toString() === admin.state.toString();      case Role.BRANCH_ADMIN:
        return guest.branch.toString() === admin.branch.toString();
      case Role.ZONAL_ADMIN:
        // Check if guest's branch is accessible to this zonal admin
        const branches = await this.adminHierarchyService.getAccessibleBranches(admin._id.toString());
        return branches?.some(b => b._id.toString() === guest.branch.toString()) || false;
      default:
        return false;
    }
  }

  /**
   * Generate guest summary statistics
   */
  private generateGuestSummary(guests: GuestDocument[]): {
    totalGuests: number;
    checkedInGuests: number;
    busPreference: number;
    privatePreference: number;
    statusBreakdown: Record<string, number>;
  } {
    const summary = {
      totalGuests: guests.length,
      checkedInGuests: guests.filter(g => g.checkedIn).length,
      busPreference: guests.filter(g => g.transportPreference === 'bus').length,
      privatePreference: guests.filter(g => g.transportPreference === 'private').length,
      statusBreakdown: {}
    };

    // Status breakdown
    guests.forEach(guest => {
      const status = guest.status || 'invited';
      summary.statusBreakdown[status] = (summary.statusBreakdown[status] || 0) + 1;
    });

    return summary;
  }
}

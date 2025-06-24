import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { Zone, ZoneDocument } from '../schemas/zone.schema';
import { Branch, BranchDocument } from '../schemas/branch.schema';
import { Event, EventDocument } from '../schemas/event.schema';
import { Guest, GuestDocument } from '../schemas/guest.schema';
import { Role } from '../common/enums/role.enum';
import { 
  RegistrarRegistrationDto,
  ZoneAssignmentDto,
  SingleZoneAssignmentDto,
  RemoveZoneAssignmentDto,
  UpdateRegistrarProfileDto, 
  ApproveRegistrarDto, 
  RejectRegistrarDto
} from './dto';
import { UsersService } from '../users/users.service';
import { AdminHierarchyService } from '../admin-hierarchy/admin-hierarchy.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class RegistrarsService {  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Zone.name) private zoneModel: Model<ZoneDocument>,
    @InjectModel(Branch.name) private branchModel: Model<BranchDocument>,
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    @InjectModel(Guest.name) private guestModel: Model<GuestDocument>,
    private usersService: UsersService,
    private adminHierarchyService: AdminHierarchyService,
  ) {}
  /**
   * Phase 4.1: Registrar registration with Branch Admin approval workflow
   */  async registerRegistrar(registrationDto: RegistrarRegistrationDto): Promise<{ message: string; registrarId: string }> {
    // Check if user with this email already exists
    const existingUser = await this.userModel.findOne({ email: registrationDto.email });
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }
    
    // Validate branch exists and is active
    const branch = await this.branchModel.findOne({ 
      _id: registrationDto.branch, 
      isActive: true 
    });
    
    if (!branch) {
      throw new BadRequestException('Invalid or inactive branch');
    }
    
    // Validate state matches branch
    if (branch.stateId.toString() !== registrationDto.state) {
      throw new BadRequestException('State does not match the selected branch');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registrationDto.password, 10);

    // Create registrar user
    const registrar = new this.userModel({
      name: registrationDto.name,
      email: registrationDto.email,
      phone: registrationDto.phone,
      password: hashedPassword,
      role: Role.REGISTRAR,
      state: new Types.ObjectId(registrationDto.state),
      branch: new Types.ObjectId(registrationDto.branch),
      isApproved: false, // Requires Branch Admin approval
      createdAt: new Date(),
    });

    const savedRegistrar = await registrar.save();

    return {
      message: 'Registrar registration submitted successfully. Awaiting Branch Admin approval.',
      registrarId: savedRegistrar._id.toString()
    };
  }

  /**
   * Phase 4.1: Zone assignment by Branch/Zonal Admins
   */
  async assignZonesToRegistrar(assignmentDto: ZoneAssignmentDto, adminId: string): Promise<{ message: string; assignedZones: string[] }> {
    const admin = await this.adminHierarchyService.getAdminWithHierarchy(adminId);
    
    // Validate admin can assign zones
    if (![Role.BRANCH_ADMIN, Role.ZONAL_ADMIN].includes(admin.role)) {
      throw new ForbiddenException('Only Branch or Zonal Admins can assign zones to registrars');
    }

    // Get registrar
    const registrar = await this.userModel.findById(assignmentDto.registrarId);
    if (!registrar) {
      throw new NotFoundException('Registrar not found');
    }

    if (registrar.role !== Role.REGISTRAR) {
      throw new BadRequestException('User is not a registrar');
    }

    if (!registrar.isApproved) {
      throw new ForbiddenException('Registrar must be approved before zone assignment');
    }

    // Validate admin has access to assign zones to this registrar
    if (admin.role === Role.BRANCH_ADMIN) {
      if (registrar.branch?.toString() !== admin.branch?.toString()) {
        throw new ForbiddenException('Can only assign zones to registrars in your branch');
      }
    }

    // Validate all zones belong to accessible areas
    const validZones = [];
    for (const zoneId of assignmentDto.zoneIds) {
      const canAccess = await this.adminHierarchyService.canAccessZone(adminId, zoneId);
      if (!canAccess) {
        throw new ForbiddenException(`No access to zone ${zoneId}`);
      }
      validZones.push(new Types.ObjectId(zoneId));
    }

    // Get existing zone assignments
    const existingZones = registrar.assignedZones || [];
    const newZones = validZones.filter(zoneId => 
      !existingZones.some(existing => existing.toString() === zoneId.toString())
    );

    // Add new zones to registrar's assignments
    registrar.assignedZones = [...existingZones, ...newZones];
    await registrar.save();

    return {
      message: `Successfully assigned ${newZones.length} zones to registrar`,
      assignedZones: newZones.map(zone => zone.toString())
    };
  }

  /**
   * Phase 4.1: Single zone assignment
   */
  async assignSingleZone(assignmentDto: SingleZoneAssignmentDto, adminId: string): Promise<{ message: string }> {
    return this.assignZonesToRegistrar({
      registrarId: assignmentDto.registrarId,
      zoneIds: [assignmentDto.zoneId],
      notes: assignmentDto.notes
    }, adminId);
  }

  /**
   * Phase 4.1: Remove zone assignment
   */
  async removeZoneAssignment(removeDto: RemoveZoneAssignmentDto, adminId: string): Promise<{ message: string }> {
    const admin = await this.adminHierarchyService.getAdminWithHierarchy(adminId);
    
    if (![Role.BRANCH_ADMIN, Role.ZONAL_ADMIN].includes(admin.role)) {
      throw new ForbiddenException('Only Branch or Zonal Admins can remove zone assignments');
    }

    // Validate admin has access to this zone
    const canAccess = await this.adminHierarchyService.canAccessZone(adminId, removeDto.zoneId);
    if (!canAccess) {
      throw new ForbiddenException('No access to this zone');
    }

    const registrar = await this.userModel.findById(removeDto.registrarId);
    if (!registrar) {
      throw new NotFoundException('Registrar not found');
    }

    // Remove zone from assignments
    registrar.assignedZones = registrar.assignedZones?.filter(
      zoneId => zoneId.toString() !== removeDto.zoneId
    ) || [];

    await registrar.save();

    return {
      message: 'Zone assignment removed successfully'
    };
  }

  /**
   * Phase 4.1: Get registrars by Branch Admin
   */
  async getRegistrarsByBranch(branchAdminId: string): Promise<UserDocument[]> {
    const branchAdmin = await this.userModel.findById(branchAdminId);
    if (!branchAdmin || branchAdmin.role !== Role.BRANCH_ADMIN) {
      throw new ForbiddenException('Only branch admins can view registrars in their branch');
    }

    return this.userModel.find({
      role: Role.REGISTRAR,
      branch: branchAdmin.branch,
      isApproved: true
    })
    .populate('state', 'name')
    .populate('branch', 'name')
    .populate('assignedZones', 'name')
    .select('-password')
    .exec();
  }
  /**
   * Phase 4.1: Get pending registrars for approval
   */  async getPendingRegistrars(branchAdminId: string): Promise<UserDocument[]> {
    try {
      const result = await this.usersService.getPendingRegistrars(branchAdminId);
      return result;
    } catch (error) {
      throw error;
    }
  }
  /**
   * Phase 4.1: Get approved registrars for management
   */
  async getApprovedRegistrars(branchAdminId: string): Promise<UserDocument[]> {
    console.log('DEBUG - RegistrarsService - getApprovedRegistrars: Called with branchAdminId:', branchAdminId);
    
    try {
      // Get the branch admin to determine their branch
      const branchAdmin = await this.userModel.findById(branchAdminId);
      console.log('DEBUG - RegistrarsService - getApprovedRegistrars: Found branch admin:', 
        branchAdmin ? { id: branchAdmin._id, role: branchAdmin.role, branch: branchAdmin.branch } : 'Not found');
      
      if (!branchAdmin || branchAdmin.role !== Role.BRANCH_ADMIN) {
        throw new ForbiddenException('Only branch admins can view approved registrars');
      }
      
      // Convert branch to ObjectId if it's a string
      const branchFilter = typeof branchAdmin.branch === 'string' 
        ? new Types.ObjectId(branchAdmin.branch) 
        : branchAdmin.branch;
      
      console.log('DEBUG - RegistrarsService - getApprovedRegistrars: Using branch filter:', branchFilter);

      // Find all approved registrars in the branch admin's branch
      const registrars = await this.userModel.find({
        role: Role.REGISTRAR,
        branch: branchFilter,
        isApproved: true,
        isActive: true
      })
      .populate('branch', 'name')
      .populate('state', 'name')
      .select('name email phone role state branch approvedAt approvedBy createdAt')
      .sort({ createdAt: -1 })
      .exec();
      
      console.log('DEBUG - RegistrarsService - getApprovedRegistrars: Found registrars count:', registrars?.length || 0);
      return registrars;
    } catch (error) {
      console.error('DEBUG - RegistrarsService - getApprovedRegistrars: Error:', error.message, error.stack);
      throw error;
    }
  }
  /**
   * Phase 4.1: Approve registrar
   */
  async approveRegistrar(registrarId: string, branchAdminId: string, approverName: string): Promise<{ message: string; registrar: UserDocument }> {
    // Verify branch admin
    const branchAdmin = await this.userModel.findById(branchAdminId);
    if (!branchAdmin || branchAdmin.role !== Role.BRANCH_ADMIN) {
      throw new ForbiddenException('Only branch admins can approve registrars');
    }

    // Find the registrar
    const registrar = await this.userModel.findById(registrarId);
    if (!registrar) {
      throw new NotFoundException('Registrar not found');
    }

    if (registrar.role !== Role.REGISTRAR) {
      throw new BadRequestException('User is not a registrar');
    }

    if (registrar.branch?.toString() !== branchAdmin.branch?.toString()) {
      throw new ForbiddenException('Can only approve registrars in your branch');
    }

    if (registrar.isApproved) {
      throw new BadRequestException('Registrar is already approved');
    }    // Update the registrar status
    registrar.isApproved = true;
    registrar.approvedBy = new Types.ObjectId(branchAdminId);
    registrar.approverName = approverName;
    registrar.approvedAt = new Date();
    
    await registrar.save();
    
    return {
      message: 'Registrar approved successfully',
      registrar: registrar
    };
  }
  /**
   * Phase 4.1: Reject registrar (custom implementation)
   */
  async rejectRegistrar(registrarId: string, branchAdminId: string, rejectionReason?: string): Promise<{ message: string }> {
    const branchAdmin = await this.userModel.findById(branchAdminId);
    if (!branchAdmin || branchAdmin.role !== Role.BRANCH_ADMIN) {
      throw new ForbiddenException('Only branch admins can reject registrars');
    }

    const registrar = await this.userModel.findById(registrarId);
    if (!registrar) {
      throw new NotFoundException('Registrar not found');
    }

    if (registrar.role !== Role.REGISTRAR) {
      throw new BadRequestException('User is not a registrar');
    }

    if (registrar.branch?.toString() !== branchAdmin.branch?.toString()) {
      throw new ForbiddenException('Can only reject registrars in your branch');
    }

    if (registrar.isApproved) {
      throw new BadRequestException('Cannot reject an already approved registrar');
    }

    // Mark as rejected by setting a flag or removing the record
    registrar.isActive = false;
    registrar.rejectionReason = rejectionReason || 'Rejected by branch admin';
    registrar.rejectedBy = new Types.ObjectId(branchAdminId);
    registrar.rejectedAt = new Date();
    await registrar.save();

    return {
      message: 'Registrar registration rejected successfully'
    };
  }

  /**
   * Phase 4.1: Registrar profile management
   */
  async updateRegistrarProfile(registrarId: string, updateDto: UpdateRegistrarProfileDto, userId: string): Promise<{ message: string; registrar: UserDocument }> {
    // Validate user can update this profile (self or admin)
    const requestingUser = await this.userModel.findById(userId);
    if (!requestingUser) {
      throw new NotFoundException('User not found');
    }

    const canUpdate = userId === registrarId || 
                     [Role.SUPER_ADMIN, Role.BRANCH_ADMIN].includes(requestingUser.role);

    if (!canUpdate) {
      throw new ForbiddenException('Cannot update this profile');
    }

    const registrar = await this.userModel.findById(registrarId);
    if (!registrar) {
      throw new NotFoundException('Registrar not found');
    }

    if (registrar.role !== Role.REGISTRAR) {
      throw new BadRequestException('User is not a registrar');
    }

    // Update profile fields
    Object.keys(updateDto).forEach(key => {
      if (updateDto[key] !== undefined) {
        registrar[key] = updateDto[key];
      }
    });

    const updatedRegistrar = await registrar.save();

    return {
      message: 'Registrar profile updated successfully',
      registrar: updatedRegistrar
    };
  }

  /**
   * Phase 4.1: Get registrar profile with zone assignments
   */
  async getRegistrarProfile(registrarId: string): Promise<UserDocument> {
    const registrar = await this.userModel.findById(registrarId)
      .populate('state', 'name')
      .populate('branch', 'name')
      .populate('assignedZones', 'name branchId')
      .select('-password')
      .exec();

    if (!registrar) {
      throw new NotFoundException('Registrar not found');
    }

    if (registrar.role !== Role.REGISTRAR) {
      throw new BadRequestException('User is not a registrar');
    }

    return registrar;
  }

  /**
   * Phase 4.1: Get all approved registrars (for admins)
   */  async getAllApprovedRegistrars(adminId: string): Promise<UserDocument[]> {
    const admin = await this.adminHierarchyService.getAdminWithHierarchy(adminId);
    
    let query: any = {
      role: Role.REGISTRAR,
      isApproved: true
    };    // Filter based on admin hierarchy
    switch (admin.role) {
      case Role.STATE_ADMIN:
        query.state = admin.state;
        break;
      case Role.BRANCH_ADMIN:
        query.branch = admin.branch;
        break;
      case Role.ZONAL_ADMIN:
        // Zonal admins can only see registrars assigned to their zone
        if (admin.zone) {
          query.assignedZones = { $in: [admin.zone] };
        } else {
          // Fallback: no zone assigned, return empty result
          query._id = { $in: [] };
        }
        break;
      // SUPER_ADMIN can see all
      default:
        break;
    }    
    const result = await this.userModel.find(query)
      .populate('state', 'name')
      .populate('branch', 'name')
      .populate('assignedZones', 'name')
      .select('-password')
      .sort({ createdAt: -1 })
      .exec();
    
    return result;
  }

  /**
   * Phase 4.1: Get registrars assigned to specific zone
   */
  async getRegistrarsByZone(zoneId: string, adminId: string): Promise<UserDocument[]> {
    // Validate admin has access to this zone
    const canAccess = await this.adminHierarchyService.canAccessZone(adminId, zoneId);
    if (!canAccess) {
      throw new ForbiddenException('No access to this zone');
    }

    return this.userModel.find({
      role: Role.REGISTRAR,
      isApproved: true,
      assignedZones: { $in: [new Types.ObjectId(zoneId)] }
    })
    .populate('state', 'name')
    .populate('branch', 'name')
    .populate('assignedZones', 'name')
    .select('-password')
    .exec();
  }
  /**
   * Phase 4.1: Multiple zone assignments support - Get registrar assignments summary
   */  async getRegistrarAssignmentsSummary(adminId: string): Promise<any> {
    const admin = await this.adminHierarchyService.getAdminWithHierarchy(adminId);
    
    let registrars: UserDocument[];
    
    if (admin.role === Role.BRANCH_ADMIN) {
      registrars = await this.getRegistrarsByBranch(adminId);
    } else {
      registrars = await this.getAllApprovedRegistrars(adminId);
    }    
    const summary = {
      totalRegistrars: registrars.length,
      assignedRegistrars: registrars.filter(r => r.assignedZones && r.assignedZones.length > 0).length,
      unassignedRegistrars: registrars.filter(r => !r.assignedZones || r.assignedZones.length === 0).length,
      multipleZoneAssignments: registrars.filter(r => r.assignedZones && r.assignedZones.length > 1).length,
      registrars: registrars.map(r => ({
        id: r._id,
        name: r.name,
        email: r.email,
        branch: r.branch,
        assignedZoneCount: r.assignedZones ? r.assignedZones.length : 0,
        assignedZones: r.assignedZones
      }))
    };
    
    return summary;
  }

  /**
   * Get registrar statistics dashboard data
   */
  async getRegistrarStats(registrarId: string): Promise<any> {
    try {
      // Find the registrar
      const registrar = await this.userModel.findById(registrarId);
      if (!registrar) {
        throw new NotFoundException('Registrar not found');
      }

      if (registrar.role !== Role.REGISTRAR) {
        throw new BadRequestException('User is not a registrar');
      }

      // Get the registrar's assigned zones
      const assignedZones = registrar.assignedZones || [];

      // Count events where registrar is assigned
      const eventsCount = await this.eventModel.countDocuments({
        assignedRegistrars: { $in: [new Types.ObjectId(registrarId)] }
      });

      // Count guests registered by this registrar
      const guestsCount = await this.guestModel.countDocuments({
        registeredBy: new Types.ObjectId(registrarId)
      });

      // Get recent activity (last 5 registered guests)
      const recentActivity = await this.guestModel.find({
        registeredBy: new Types.ObjectId(registrarId)
      })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email phone createdAt eventId')
      .populate('eventId', 'name startDate')
      .exec();

      return {
        stats: {
          assignedZones: assignedZones.length,
          eventsCount,
          guestsCount,
          isApproved: registrar.isApproved,
          dateJoined: (registrar as any).createdAt,
        },
        recentActivity
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all events a registrar has access to
   */
  async getRegistrarEvents(registrarId: string): Promise<any[]> {
    try {
      console.log('[DEBUG] getRegistrarEvents called with registrarId:', registrarId);
      
      // Find the registrar
      const registrar = await this.userModel.findById(registrarId)
        .populate('assignedZones', 'name branchId')
        .exec();
      
      console.log('[DEBUG] Found registrar:', registrar ? {
        id: registrar._id,
        name: registrar.name,
        email: registrar.email,
        isApproved: registrar.isApproved,
        branch: registrar.branch,
        assignedZones: registrar.assignedZones
      } : 'Not found');
      
      if (!registrar) {
        throw new NotFoundException('Registrar not found');
      }

      if (registrar.role !== Role.REGISTRAR) {
        throw new BadRequestException('User is not a registrar');
      }

      if (!registrar.isApproved) {
        console.log('[DEBUG] Registrar is not approved, approval status:', registrar.isApproved);
        throw new ForbiddenException('Registrar must be approved to view events');
      }

      // Get the registrar's assigned zones
      const assignedZoneIds = registrar.assignedZones?.map(zone => zone._id) || [];
      console.log('[DEBUG] Assigned zone IDs:', assignedZoneIds);
      
      // Branch ID check and conversion
      const branchId = typeof registrar.branch === 'string' 
        ? new Types.ObjectId(registrar.branch)
        : registrar.branch;
      
      console.log('[DEBUG] Using branch ID for query:', branchId);

      // Modified query to include events without branch information 
      // This allows registrars to see all active events if branch isn't set
      const query = {
        isActive: true,
        status: { $ne: 'cancelled' }, // Exclude cancelled events
        $or: [
          // Regular branch events
          { branch: branchId },
          // Events where branch is explicitly included
          { selectedBranches: { $in: [branchId] } },
          // Include events with no branch info for legacy support
          // (only if branch and selectedBranches are both undefined/null/empty)
          { 
            $and: [
              { $or: [
                { branch: { $exists: false } },
                { branch: null }
              ] },
              { $or: [
                { selectedBranches: { $exists: false } },
                { selectedBranches: null },
                { selectedBranches: { $size: 0 } }
              ] }
            ]
          }
        ]
      };
      
      console.log('[DEBUG] Enhanced query for event debugging. Branch ID:', branchId);
      console.log('[DEBUG] Event query:', JSON.stringify(query, null, 2));
      
      try {
        console.log('[DEBUG] Executing expanded query for events:', JSON.stringify(query));
          // Get all events matching criteria
        const events = await this.eventModel.find(query)
          .populate('selectedBranches', 'name')
          .populate('selectedZones', 'name')
          .populate({
            path: 'registrarRequests.registrarId',
            select: 'name email'
          })
          .sort({ date: 1 })  // Sort by date
          .exec();
          
        console.log('[DEBUG] Events found:', events.length);
          if (events.length === 0) {
          // Let's first check if there are any events for this branch
          const branchEvents = await this.eventModel.find({ 
            $or: [
              { branch: branchId },
              { selectedBranches: { $in: [branchId] } }
            ],
            isActive: true
          })
            .select('_id name selectedBranches selectedZones date')
            .limit(5)
            .exec();
              console.log('[DEBUG] Branch events:', 
            branchEvents.map(e => ({
              id: e._id,
              name: e.name,
              selectedBranches: e.selectedBranches,
              selectedZones: e.selectedZones,
              date: e.date
            }))
          );
            // Let's check if there are any events at all in the system
          const allEvents = await this.eventModel.find({ isActive: true })
            .select('_id name selectedBranches selectedZones date registrarRequests')
            .limit(5)
            .exec();
              console.log('[DEBUG] Sample of all active events in system:', 
            allEvents.map(e => ({
              id: e._id,
              name: e.name,
              selectedBranches: e.selectedBranches || [],
              selectedZones: e.selectedZones || [],
              date: e.date,
              registrarRequests: e.registrarRequests?.length || 0
            }))
          );
        } else {          // Log a sample of the events found
          console.log('[DEBUG] Sample of events found:', 
            events.slice(0, 2).map(e => ({
              id: e._id,
              name: e.name,
              selectedBranches: e.selectedBranches?.map(b => (b as any).name || b) || [],
              selectedZones: e.selectedZones?.map(z => (z as any).name || z) || [],
              date: e.date,
              registrarRequests: e.registrarRequests?.map(r => ({
                registrarId: r.registrarId,
                status: r.status
              }))
            }))
          );
        }

        // Format events for consistent frontend display
        const formattedEvents = events.map(event => {
          // Create a plain object that we can modify safely
          const formattedEvent = event.toObject();
            // Ensure branch information is available
          if (!(formattedEvent as any).branch) {
            // Use type assertion to avoid TypeScript errors
            (formattedEvent as any).branch = branchId;
            (formattedEvent as any).branchName = 'Church Branch'; // Fallback name
          }
          
          // Extract date information for consistent display
          if (formattedEvent.date && !(formattedEvent as any).startDate) {
            try {
              // Try to parse the date string into a Date object
              const eventDate = new Date(formattedEvent.date);
              (formattedEvent as any).startDate = eventDate.toISOString();
              
              // Set endDate to 2 hours after startDate if not defined
              if (!(formattedEvent as any).endDate) {
                const endDate = new Date(eventDate);
                endDate.setHours(endDate.getHours() + 2);
                (formattedEvent as any).endDate = endDate.toISOString();
              }
            } catch (err) {
              console.log('[DEBUG] Error parsing date:', formattedEvent.date, err);
            }
          }
          
          return formattedEvent;
        });
        
        console.log('[DEBUG] Returning formatted events, count:', formattedEvents.length);
        if (formattedEvents.length > 0) {
          console.log('[DEBUG] Sample of first formatted event:', JSON.stringify(formattedEvents[0], null, 2));
        }
        
        return formattedEvents;
      } catch (error) {
        console.error('[DEBUG] Error executing event query:', error);
        throw error;
      }
    } catch (error) {
      console.error('[DEBUG] Error in getRegistrarEvents:', error);
      throw error;
    }
  }

  /**
   * Helper method to check registrar approval status in detail
   */
  async checkRegistrarStatus(registrarId: string): Promise<any> {
    console.log('[DEBUG] Checking detailed registrar status for ID:', registrarId);
    
    try {
      // Find the registrar with approval details
      const registrar = await this.userModel.findById(registrarId)
        .select('name email role isApproved isActive branch state zone assignedZones approvedAt approverName')
        .populate('branch', 'name')
        .populate('state', 'name')
        .populate('assignedZones', 'name branchId')
        .exec();
      
      if (!registrar) {
        console.error('[DEBUG] Registrar not found with ID:', registrarId);
        throw new NotFoundException('Registrar not found');
      }
      
      console.log('[DEBUG] Registrar details:', {
        id: registrar._id,
        name: registrar.name,
        email: registrar.email,
        role: registrar.role,
        isApproved: registrar.isApproved,
        isActive: registrar.isActive,
        branch: registrar.branch,
        assignedZones: registrar.assignedZones?.length || 0,
        approvedAt: registrar.approvedAt,
        approverName: registrar.approverName
      });
      
      // Check if there are any events that this registrar can access
      const branchId = typeof registrar.branch === 'string' 
        ? new Types.ObjectId(registrar.branch) 
        : registrar.branch;
        
      const assignedZoneIds = registrar.assignedZones?.map(zone => zone._id) || [];
      
      const availableEventCount = await this.eventModel.countDocuments({
        isActive: true,
        $or: [
          { branch: branchId },
          { selectedBranches: { $in: [branchId] } }
        ]
      });
      
      console.log('[DEBUG] Available events in registrar branch:', availableEventCount);
      
      return {
        registrarDetails: {
          id: registrar._id,
          name: registrar.name,
          email: registrar.email,
          role: registrar.role,
          isApproved: registrar.isApproved,
          isActive: registrar.isActive,
          branch: registrar.branch,
          assignedZones: registrar.assignedZones,
          approvedAt: registrar.approvedAt
        },
        eventStatus: {
          availableEventCount,
        }
      };
    } catch (error) {
      console.error('[DEBUG] Error checking registrar status:', error);
      throw error;
    }
  }

  /**
   * Debug method to inspect the structure of events in the database
   */
  async debugEventStructure(): Promise<any> {
    try {
      // Get a sample event
      const sampleEvent = await this.eventModel.findOne({ isActive: true }).exec();
      
      if (!sampleEvent) {
        return {
          message: 'No active events found',
          eventCount: 0
        };
      }
      
      // Count various event types
      const stats = {
        totalEvents: await this.eventModel.countDocuments(),
        activeEvents: await this.eventModel.countDocuments({ isActive: true }),
        eventsWithBranch: await this.eventModel.countDocuments({ branch: { $exists: true, $ne: null } }),
        eventsWithSelectedBranches: await this.eventModel.countDocuments({ 'selectedBranches.0': { $exists: true } }),
        eventsWithZone: await this.eventModel.countDocuments({ zone: { $exists: true, $ne: null } }),
        eventsWithSelectedZones: await this.eventModel.countDocuments({ 'selectedZones.0': { $exists: true } }),
        eventsWithRegistrars: await this.eventModel.countDocuments({ 'registrars.0': { $exists: true } }),
        eventsWithRegistrarRequests: await this.eventModel.countDocuments({ 'registrarRequests.0': { $exists: true } })
      };
      
      // Get available event fields
      const eventFields = Object.keys(sampleEvent.toObject());
      
      // Deep check for startDate and endDate
      let hasStartDateField = false;
      let hasEndDateField = false;
      let startDateSources = [];
      let endDateSources = [];
      
      if (sampleEvent.toObject().hasOwnProperty('startDate')) {
        hasStartDateField = true;
        startDateSources.push('direct field');
      }
      
      if (sampleEvent.toObject().hasOwnProperty('endDate')) {
        hasEndDateField = true;
        endDateSources.push('direct field');
      }
      
      // Check if date field exists and can be used as a fallback
      const hasDateField = sampleEvent.toObject().hasOwnProperty('date');
      
      return {
        message: 'Event structure debug information',
        stats,
        eventFields,
        dateFields: {
          hasStartDateField,
          hasEndDateField,
          hasDateField,
          startDateSources,
          endDateSources,
          sampleDate: sampleEvent.toObject().date
        },
        // Sample of an actual event structure
        sampleEvent: sampleEvent.toObject()
      };
    } catch (error) {
      console.error('[DEBUG] Error in debugEventStructure:', error);
      throw error;
    }
  }
}

import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { Zone, ZoneDocument } from '../schemas/zone.schema';
import { Branch, BranchDocument } from '../schemas/branch.schema';
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
export class RegistrarsService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Zone.name) private zoneModel: Model<ZoneDocument>,
    @InjectModel(Branch.name) private branchModel: Model<BranchDocument>,
    private usersService: UsersService,
    private adminHierarchyService: AdminHierarchyService,
  ) {}

  /**
   * Phase 4.1: Registrar registration with Branch Admin approval workflow
   */
  async registerRegistrar(registrationDto: RegistrarRegistrationDto): Promise<{ message: string; registrarId: string }> {
    // Check if user with this email already exists
    const existingUser = await this.userModel.findOne({ email: registrationDto.email });
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }    // Validate branch exists and is active
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
   */
  async getPendingRegistrars(branchAdminId: string): Promise<UserDocument[]> {
    return this.usersService.getPendingRegistrars(branchAdminId);
  }

  /**
   * Phase 4.1: Approve registrar
   */
  async approveRegistrar(approvalDto: ApproveRegistrarDto, branchAdminId: string): Promise<{ message: string; registrar: UserDocument }> {
    const result = await this.usersService.approveRegistrar(approvalDto.registrarId, branchAdminId);
    
    return {
      message: 'Registrar approved successfully',
      registrar: result
    };
  }

  /**
   * Phase 4.1: Reject registrar (custom implementation)
   */
  async rejectRegistrar(rejectDto: RejectRegistrarDto, branchAdminId: string): Promise<{ message: string }> {
    const branchAdmin = await this.userModel.findById(branchAdminId);
    if (!branchAdmin || branchAdmin.role !== Role.BRANCH_ADMIN) {
      throw new ForbiddenException('Only branch admins can reject registrars');
    }

    const registrar = await this.userModel.findById(rejectDto.registrarId);
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
    registrar.rejectionReason = rejectDto.rejectionReason;
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
}

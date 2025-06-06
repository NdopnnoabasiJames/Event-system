import { HttpException, HttpStatus, Injectable, NotFoundException, UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Schema as MongooseSchema, Types } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { Event, EventDocument } from '../schemas/event.schema';
import { Guest, GuestDocument } from '../schemas/guest.schema';
import { State, StateDocument } from '../schemas/state.schema';
import { Branch, BranchDocument } from '../schemas/branch.schema';
import { Zone, ZoneDocument } from '../schemas/zone.schema';
import { Role } from '../common/enums/role.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    @InjectModel(Guest.name) private guestModel: Model<GuestDocument>,
    @InjectModel(State.name) private stateModel: Model<StateDocument>,
    @InjectModel(Branch.name) private branchModel: Model<BranchDocument>,
    @InjectModel(Zone.name) private zoneModel: Model<ZoneDocument>,
  ) {}
 async create(createUserDto: CreateUserDto): Promise<UserDocument> {
  try {
    // Ensure required fields are present
    if (!createUserDto.name || !createUserDto.email || !createUserDto.password) {
      throw new Error('Missing required fields');
    }

    const user = new this.userModel({
      ...createUserDto,
      role: createUserDto.role
    });

    return await user.save();
  } catch (error) {
    if (error.code === 11000) { // MongoDB duplicate key error
      throw new Error('Email already exists');
    }
    // Log the error for debugging
    console.error('Error creating user:', error);
    throw new Error(`Failed to create user: ${error.message}`);
  }
}  async findByEmail(email: string): Promise<UserDocument> {
  try {
    const user = await this.userModel.findOne({ email }).exec();
    return user;
  } catch (error) {
    throw new HttpException(`Failed to find user by email: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
  async findById(id: string): Promise<UserDocument> {
    try {
      const user = await this.userModel.findById(id).exec();
      if (!user) {
        throw new NotFoundException('User not found');
      }
      return user;
    } catch (error) {
      throw new HttpException(`Failed to find user by ID: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  
  async findByRole(role: string): Promise<UserDocument[]> {
    try {
      const users = await this.userModel.find({ role }).exec();
      return users;
    } catch (error) {
      throw new HttpException(`Failed to find users by role: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  async findAllWorkers(): Promise<UserDocument[]> {
  try {
    return await this.userModel.find({ role: Role.WORKER }).exec();
  } catch (error) {
    throw new HttpException(`Failed to retrieve workers: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

  async update(id: string, updateUserDto: UpdateUserDto, currentUser: any): Promise<UserDocument> {
    // Only admin can update other users, marketers can only update their own profile
    if (currentUser.role !== Role.SUPER_ADMIN && currentUser.userId !== id) {
      throw new UnauthorizedException('You can only update your own profile');
    }

    const user = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async delete(id: string, currentUser: any): Promise<void> {
    // Only admin can delete users
    if (currentUser.role !== Role.SUPER_ADMIN) {
      throw new UnauthorizedException('Only super admins can delete users');
    }

    const user = await this.userModel.findByIdAndDelete(id).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
  }

async addEventParticipation(userId: string, eventId: string): Promise<UserDocument> {
  const user = await this.userModel.findById(userId).exec();
  if (!user) {
    throw new NotFoundException('User not found');
  }

  // Initialize eventParticipation if it doesn't exist
  if (!user.eventParticipation) {
    user.eventParticipation = [];
  }
  
  const eventObjectId = new Types.ObjectId(eventId);  
  const isEventAlreadyAdded = user.eventParticipation.some(e => e.toString() === eventObjectId.toString());
  
  if (!isEventAlreadyAdded) {
    user.eventParticipation.push(eventObjectId);
    await user.save();
  }
  
  return user;
}

  async removeEventParticipation(userId: string, eventId: string): Promise<UserDocument> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const eventObjectId = new Types.ObjectId(eventId);
    user.eventParticipation = user.eventParticipation.filter(
      (event) => event.toString() !== eventObjectId.toString()
    );
    return user.save();
  }

  // Admin approval methods
  async getPendingAdmins(approverRole: string, approverState?: string, approverBranch?: string): Promise<UserDocument[]> {
    const query: any = { isApproved: false };
    
    if (approverRole === 'super_admin') {
      // Super admin can see all pending state admins
      query.role = 'state_admin';
    } else if (approverRole === 'state_admin' && approverState) {
      // State admin can see pending branch admins in their state
      query.role = 'branch_admin';
      query.state = approverState;
    } else if (approverRole === 'branch_admin' && approverBranch) {
      // Branch admin can see pending zonal admins, workers, and registrars in their branch
      query.role = { $in: ['zonal_admin', 'worker', 'registrar'] };
      query.branch = approverBranch;
    }
    
    return this.userModel.find(query)
      .populate('state', 'name')
      .populate('branch', 'name')
      .populate('zone', 'name')
      .exec();
  }

  // Get approved admins based on approval hierarchy
  async getApprovedAdmins(approverRole: string, approverState?: string, approverBranch?: string): Promise<UserDocument[]> {
    const query: any = { 
      isApproved: true,
      isActive: true // Only show active approved admins
    };
    
    if (approverRole === 'super_admin') {
      // Super admin can see all approved state admins
      query.role = 'state_admin';
    } else if (approverRole === 'state_admin' && approverState) {
      // State admin can see approved branch admins in their state
      query.role = 'branch_admin';
      query.state = approverState;
    } else if (approverRole === 'branch_admin' && approverBranch) {
      // Branch admin can see approved zonal admins, workers, and registrars in their branch
      query.role = { $in: ['zonal_admin', 'worker', 'registrar'] };
      query.branch = approverBranch;
    }
    
    return this.userModel.find(query)
      .populate('state', 'name')
      .populate('branch', 'name location')
      .populate('zone', 'name')
      .populate('approvedBy', 'name email')
      .select('name email role state branch zone approvedBy isActive createdAt')
      .sort({ createdAt: -1 })
      .exec();
  }

  // Get pending workers for branch admin approval
  async getPendingWorkers(branchAdminId: string): Promise<UserDocument[]> {
    const branchAdmin = await this.userModel.findById(branchAdminId).exec();
    if (!branchAdmin || branchAdmin.role !== Role.BRANCH_ADMIN) {
      throw new ForbiddenException('Only branch admins can view pending workers');
    }

    return this.userModel.find({
      role: Role.WORKER,
      isApproved: false,
      branch: branchAdmin.branch
    })
    .populate('state', 'name')
    .populate('branch', 'name')
    .exec();
  }

  // Get pending registrars for branch admin approval
  async getPendingRegistrars(branchAdminId: string): Promise<UserDocument[]> {
    const branchAdmin = await this.userModel.findById(branchAdminId).exec();
    if (!branchAdmin || branchAdmin.role !== Role.BRANCH_ADMIN) {
      throw new ForbiddenException('Only branch admins can view pending registrars');
    }

    return this.userModel.find({
      role: Role.REGISTRAR,
      isApproved: false,
      branch: branchAdmin.branch
    })
    .populate('state', 'name')
    .populate('branch', 'name')
    .exec();
  }

  // Approve worker by branch admin
  async approveWorker(workerId: string, branchAdminId: string): Promise<UserDocument> {
    const branchAdmin = await this.userModel.findById(branchAdminId).exec();
    if (!branchAdmin || branchAdmin.role !== Role.BRANCH_ADMIN) {
      throw new ForbiddenException('Only branch admins can approve workers');
    }

    const worker = await this.userModel.findById(workerId).exec();
    if (!worker) {
      throw new NotFoundException('Worker not found');
    }

    if (worker.role !== Role.WORKER) {
      throw new BadRequestException('User is not a worker');
    }

    if (worker.branch?.toString() !== branchAdmin.branch?.toString()) {
      throw new ForbiddenException('Can only approve workers in your branch');
    }

    if (worker.isApproved) {
      throw new HttpException('Worker is already approved', HttpStatus.BAD_REQUEST);
    }

    worker.isApproved = true;
    worker.approvedBy = new Types.ObjectId(branchAdminId);
    return worker.save();
  }

  // Approve registrar by branch admin
  async approveRegistrar(registrarId: string, branchAdminId: string): Promise<UserDocument> {
    const branchAdmin = await this.userModel.findById(branchAdminId).exec();
    if (!branchAdmin || branchAdmin.role !== Role.BRANCH_ADMIN) {
      throw new ForbiddenException('Only branch admins can approve registrars');
    }

    const registrar = await this.userModel.findById(registrarId).exec();
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
      throw new HttpException('Registrar is already approved', HttpStatus.BAD_REQUEST);
    }

    registrar.isApproved = true;
    registrar.approvedBy = new Types.ObjectId(branchAdminId);
    return registrar.save();
  }

  // Approve admin (State Admin approves Branch Admin, Super Admin approves State Admin)
  async approveAdmin(adminId: string, approverId: string): Promise<UserDocument> {
    const approver = await this.userModel.findById(approverId).exec();
    if (!approver) {
      throw new NotFoundException('Approver not found');
    }

    const admin = await this.userModel.findById(adminId).exec();
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    // Validation logic based on hierarchy
    if (approver.role === Role.SUPER_ADMIN && admin.role === Role.STATE_ADMIN) {
      // Super admin can approve state admins
    } else if (approver.role === Role.STATE_ADMIN && admin.role === Role.BRANCH_ADMIN) {
      // State admin can approve branch admins in their state
      if (admin.state?.toString() !== approver.state?.toString()) {
        throw new ForbiddenException('Can only approve admins in your state');
      }
    } else {
      throw new ForbiddenException('Invalid approval hierarchy');
    }

    if (admin.isApproved) {
      throw new HttpException('Admin is already approved', HttpStatus.BAD_REQUEST);
    }

    admin.isApproved = true;
    admin.approvedBy = new Types.ObjectId(approverId);
    return admin.save();
  }

  // Reject admin (remove from system)
  async rejectAdmin(adminId: string): Promise<{ message: string }> {
    const admin = await this.userModel.findById(adminId).exec();
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    if (admin.isApproved) {
      throw new BadRequestException('Cannot reject an already approved admin');
    }

    await this.userModel.findByIdAndDelete(adminId).exec();
    
    return {
      message: 'Admin registration rejected and removed'
    };
  }

  // System Metrics Methods for Super Admin Dashboard
  /**
   * Get comprehensive system metrics
   */  async getSystemMetrics(): Promise<any> {
    try {
      const [
        totalUsers,
        totalStates,
        totalBranches,
        totalZones,
        totalEvents,
        totalGuests,
        pendingAdmins,
        activeAdmins      ] = await Promise.all([
        this.userModel.countDocuments({ role: { $ne: Role.GUEST } }), // Exclude guests from total users
        this.stateModel.countDocuments({ isActive: true }),
        this.branchModel.countDocuments({ isActive: true }),
        this.zoneModel.countDocuments({ isActive: true }),
        // Now using actual database queries for events and guests
        this.eventModel.countDocuments({ isActive: true }),
        this.guestModel.countDocuments({}),
        this.userModel.countDocuments({ isApproved: false }),
        this.userModel.countDocuments({ 
          isApproved: true,
          role: { $in: [Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN] }
        })
      ]);      return {
        totalUsers,
        totalStates,
        totalBranches, 
        totalZones,
        totalEvents,
        totalGuests
      };
    } catch (error) {
      throw new HttpException(`Failed to fetch system metrics: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get admin hierarchy statistics
   */  async getAdminHierarchyStats(): Promise<any> {
    try {
      const hierarchyStats = await Promise.all([
        // State Admins with breakdown
        this.userModel.aggregate([
          { $match: { role: Role.STATE_ADMIN } },
          {
            $group: {
              _id: '$isApproved',
              count: { $sum: 1 }
            }
          }
        ]),
        
        // Branch Admins with breakdown
        this.userModel.aggregate([
          { $match: { role: Role.BRANCH_ADMIN } },
          {
            $group: {
              _id: '$isApproved',
              count: { $sum: 1 }
            }
          }
        ]),
        
        // Zonal Admins with breakdown
        this.userModel.aggregate([
          { $match: { role: Role.ZONAL_ADMIN } },
          {
            $group: {
              _id: '$isApproved',
              count: { $sum: 1 }
            }
          }        ]),

        // Workers with breakdown
        this.userModel.aggregate([
          { $match: { role: Role.WORKER } },
          {
            $group: {
              _id: '$isApproved',
              count: { $sum: 1 }
            }
          }
        ])
      ]);

      const [stateAdminStats, branchAdminStats, zonalAdminStats, workerStats] = hierarchyStats;

      return {
        stateAdmins: stateAdminStats.reduce((acc, stat) => acc + stat.count, 0),
        branchAdmins: branchAdminStats.reduce((acc, stat) => acc + stat.count, 0),
        zonalAdmins: zonalAdminStats.reduce((acc, stat) => acc + stat.count, 0),
        workers: workerStats.reduce((acc, stat) => acc + stat.count, 0)
      };
    } catch (error) {
      throw new HttpException(`Failed to fetch admin hierarchy stats: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get user role breakdown
   */
  async getUserRoleBreakdown(): Promise<any> {
    try {
      const roleBreakdown = await this.userModel.aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 },
            approved: {
              $sum: {
                $cond: [{ $eq: ['$isApproved', true] }, 1, 0]
              }
            },
            pending: {
              $sum: {
                $cond: [{ $eq: ['$isApproved', false] }, 1, 0]
              }
            }
          }
        }
      ]);

      const roles = {};
      roleBreakdown.forEach(role => {
        roles[role._id] = {
          total: role.count,
          approved: role.approved,
          pending: role.pending
        };
      });

      return {
        breakdown: roles,
        summary: {
          totalUsers: roleBreakdown.reduce((acc, role) => acc + role.count, 0),
          totalApproved: roleBreakdown.reduce((acc, role) => acc + role.approved, 0),
          totalPending: roleBreakdown.reduce((acc, role) => acc + role.pending, 0)
        }
      };    } catch (error) {
      throw new HttpException(`Failed to fetch user role breakdown: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

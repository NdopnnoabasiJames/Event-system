import { HttpException, HttpStatus, Injectable, NotFoundException, UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Schema as MongooseSchema, Types } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { Role } from '../common/enums/role.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
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
   */
  async getSystemMetrics(): Promise<any> {
    try {
      const [
        totalUsers,
        totalStates,
        totalBranches,
        totalZones,
        totalEvents,
        totalGuests,
        pendingAdmins,
        activeAdmins
      ] = await Promise.all([
        this.userModel.countDocuments(),
        this.userModel.countDocuments({ role: Role.STATE_ADMIN }),
        this.userModel.countDocuments({ role: Role.BRANCH_ADMIN }),
        this.userModel.countDocuments({ role: Role.ZONAL_ADMIN }),
        // Note: We'll need to inject EventModel and GuestModel for these counts
        // For now, returning 0 - will need to update when models are injected
        Promise.resolve(0), // totalEvents
        Promise.resolve(0), // totalGuests
        this.userModel.countDocuments({ isApproved: false }),
        this.userModel.countDocuments({ 
          isApproved: true,
          role: { $in: [Role.STATE_ADMIN, Role.BRANCH_ADMIN, Role.ZONAL_ADMIN] }
        })
      ]);

      return {
        users: {
          total: totalUsers,
          active: activeAdmins,
          pending: pendingAdmins
        },
        hierarchy: {
          states: totalStates,
          branches: totalBranches,
          zones: totalZones
        },
        events: {
          total: totalEvents,
          active: 0 // Will implement when EventModel is injected
        },
        guests: {
          total: totalGuests,
          checkedIn: 0 // Will implement when GuestModel is injected
        },
        systemHealth: {
          status: 'healthy',
          uptime: process.uptime(),
          lastUpdated: new Date()
        }
      };
    } catch (error) {
      throw new HttpException(`Failed to fetch system metrics: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get admin hierarchy statistics
   */
  async getAdminHierarchyStats(): Promise<any> {
    try {
      const hierarchyStats = await Promise.all([
        // Super Admins
        this.userModel.countDocuments({ role: Role.SUPER_ADMIN }),
        
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
          }
        ])
      ]);

      const [superAdminCount, stateAdminStats, branchAdminStats, zonalAdminStats] = hierarchyStats;

      return {
        superAdmins: {
          total: superAdminCount,
          active: superAdminCount
        },
        stateAdmins: {
          total: stateAdminStats.reduce((acc, stat) => acc + stat.count, 0),
          approved: stateAdminStats.find(s => s._id === true)?.count || 0,
          pending: stateAdminStats.find(s => s._id === false)?.count || 0
        },
        branchAdmins: {
          total: branchAdminStats.reduce((acc, stat) => acc + stat.count, 0),
          approved: branchAdminStats.find(s => s._id === true)?.count || 0,
          pending: branchAdminStats.find(s => s._id === false)?.count || 0
        },
        zonalAdmins: {
          total: zonalAdminStats.reduce((acc, stat) => acc + stat.count, 0),
          approved: zonalAdminStats.find(s => s._id === true)?.count || 0,
          pending: zonalAdminStats.find(s => s._id === false)?.count || 0
        }
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
      };
    } catch (error) {
      throw new HttpException(`Failed to fetch user role breakdown: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  /**
   * Get system health indicators
   */
  async getSystemHealth(): Promise<any> {
    try {
      const [
        totalUsers,
        recentRegistrations,
        pendingApprovals
      ] = await Promise.all([
        this.userModel.countDocuments(),
        this.userModel.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
        }),
        this.userModel.countDocuments({ isApproved: false })
      ]);

      const systemErrors = 0; // System errors - will implement proper error tracking later

      const healthScore = this.calculateHealthScore(totalUsers, pendingApprovals, systemErrors);

      return {
        status: healthScore > 80 ? 'healthy' : healthScore > 60 ? 'warning' : 'critical',
        score: healthScore,
        metrics: {
          totalUsers,
          recentRegistrations,
          pendingApprovals,
          systemErrors,
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          lastChecked: new Date()
        },
        alerts: this.generateHealthAlerts(pendingApprovals, systemErrors)
      };
    } catch (error) {
      throw new HttpException(`Failed to fetch system health: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Calculate system health score
   */
  private calculateHealthScore(totalUsers: number, pendingApprovals: number, systemErrors: number): number {
    let score = 100;
    
    // Deduct points for pending approvals
    const pendingRatio = totalUsers > 0 ? (pendingApprovals / totalUsers) * 100 : 0;
    if (pendingRatio > 20) score -= 30; // More than 20% pending
    else if (pendingRatio > 10) score -= 15; // More than 10% pending
    else if (pendingRatio > 5) score -= 5; // More than 5% pending

    // Deduct points for system errors
    if (systemErrors > 10) score -= 40;
    else if (systemErrors > 5) score -= 20;
    else if (systemErrors > 0) score -= 10;

    return Math.max(0, score);
  }

  /**
   * Generate health alerts
   */
  private generateHealthAlerts(pendingApprovals: number, systemErrors: number): string[] {
    const alerts = [];
    
    if (pendingApprovals > 10) {
      alerts.push(`High number of pending approvals: ${pendingApprovals}`);
    }
    
    if (systemErrors > 0) {
      alerts.push(`System errors detected: ${systemErrors}`);
    }
    
    if (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal > 0.9) {
      alerts.push('High memory usage detected');
    }
    
    return alerts;
  }
}

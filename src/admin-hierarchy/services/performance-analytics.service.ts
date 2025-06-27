import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../../schemas/user.schema';
import { Guest, GuestDocument } from '../../schemas/guest.schema';
import { State, StateDocument } from '../../schemas/state.schema';
import { Branch, BranchDocument } from '../../schemas/branch.schema';
import { Role } from '../../common/enums/role.enum';
import { AdminHierarchyCoreService } from './admin-hierarchy-core.service';

/**
 * Service for calculating performance metrics and analytics
 */
@Injectable()
export class PerformanceAnalyticsService {  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Guest.name) private guestModel: Model<GuestDocument>,
    @InjectModel(State.name) private stateModel: Model<StateDocument>,
    @InjectModel(Branch.name) private branchModel: Model<BranchDocument>,
    private adminHierarchyCoreService: AdminHierarchyCoreService,
  ) {}

  /**
   * Calculate performance rating for a marketer
   */
  async calculateMarketerPerformanceRating(
    marketerId: string,
  ): Promise<{ rating: number; metrics: any }> {
    console.log('🔍 DEBUG: calculateMarketerPerformanceRating called for:', marketerId);
    
    const marketer = await this.userModel.findById(marketerId).exec();
    if (!marketer || marketer.role !== Role.WORKER) {
      console.log('🔍 DEBUG: Marketer not found or invalid role:', { found: !!marketer, role: marketer?.role });
      throw new Error('Marketer not found or invalid role');
    }

    console.log('🔍 DEBUG: Marketer found:', { id: marketer._id, name: marketer.name, role: marketer.role });

    // Get marketer's performance metrics
    const totalGuests = await this.guestModel
      .countDocuments({ registeredBy: marketerId })
      .exec();

    const checkedInGuests = await this.guestModel
      .countDocuments({ registeredBy: marketerId, status: 'checked_in' })
      .exec();

    console.log('🔍 DEBUG: Guest counts for marketer:', { 
      marketerId, 
      totalGuests, 
      checkedInGuests,
      calculatedScore: totalGuests + checkedInGuests
    });

    // Let's also check what guests exist for this marketer
    const sampleGuests = await this.guestModel
      .find({ registeredBy: marketerId })
      .limit(3)
      .select('name status registeredBy')
      .exec();
    
    console.log('🔍 DEBUG: Sample guests for marketer:', JSON.stringify(sampleGuests, null, 2));

    // New scoring system: 1 point per invited + 1 point per checked-in
    const totalScore = totalGuests + checkedInGuests;
    const attendanceRate = totalGuests > 0 ? (checkedInGuests / totalGuests) * 100 : 0;

    // Calculate rating based on performance (1-5 scale)
    let rating = 1;
    if (totalScore >= 100) rating = 5;
    else if (totalScore >= 50) rating = 4;
    else if (totalScore >= 20) rating = 3;
    else if (totalScore >= 10) rating = 2;

    const metrics = {
      totalGuests,
      checkedInGuests,
      totalScore,
      attendanceRate: parseFloat(attendanceRate.toFixed(2)),
      rating,
      ratingText: this.getRatingText(rating),
    };

    console.log('🔍 DEBUG: Final metrics:', metrics);

    return { rating, metrics };
  }

  /**
   * Get marketers performance summary for an admin's jurisdiction
   */
  async getMarketersPerformanceSummary(adminId: string): Promise<any[]> {
    const admin = await this.adminHierarchyCoreService.getAdminWithHierarchy(adminId);
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
      .select(
        'name email phone state branch zone lastLogin createdAt',
      )
      .sort({ createdAt: -1 })
      .exec();

    // Calculate performance for each marketer
    const performanceSummary = await Promise.all(
      marketers.map(async (marketer) => {
        const { rating, metrics } = await this.calculateMarketerPerformanceRating(
          marketer._id.toString(),
        );

        return {
          id: marketer._id.toString(),
          name: marketer.name,          email: marketer.email,
          phone: marketer.phone,
          performance: metrics,
          lastLogin: marketer.lastLogin,
          joinedDate: (marketer as any).createdAt,
          location: {
            state: marketer.state,
            branch: marketer.branch,
            zone: marketer.zone,
          },
        };
      }),
    );

    return performanceSummary;
  }

  /**
   * Convert numeric rating to text
   */
  private getRatingText(rating: number): string {
    switch (Math.round(rating)) {
      case 5:
        return 'Excellent';
      case 4:
        return 'Good';
      case 3:
        return 'Average';
      case 2:
        return 'Below Average';
      case 1:
        return 'Poor';
      default:
        return 'Not Rated';
    }
  }

  /**
   * Calculate worker rankings within a branch
   */
  async getWorkerRankings(branchId?: string, stateId?: string, limit?: number): Promise<any[]> {
    let matchQuery: any = { role: Role.WORKER };
    if (branchId) {
      matchQuery.branch = branchId;
    } else if (stateId) {
      matchQuery.state = stateId;
    }
    const rankings = await this.userModel.aggregate([
      { $addFields: {
          branchObj: { $toObjectId: '$branch' },
          stateObj: { $toObjectId: '$state' }
        }
      },
      { $match: matchQuery },
      {
        $lookup: {
          from: 'guests',
          localField: '_id',
          foreignField: 'registeredBy',
          as: 'invitedGuests'
        }
      },
      {
        $lookup: {
          from: 'guests',
          let: { workerId: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [
              { $eq: ['$registeredBy', '$$workerId'] },
              { $eq: ['$status', 'checked_in'] }
            ]}}
            }
          ],
          as: 'checkedInGuests'
        }
      },
      {
        $addFields: {
          totalInvited: { $size: '$invitedGuests' },
          totalCheckedIn: { $size: '$checkedInGuests' },
          totalScore: { $add: [{ $size: '$invitedGuests' }, { $size: '$checkedInGuests' }] },
        }
      },
      { $sort: { totalScore: -1, totalInvited: -1 } },
      ...(limit ? [{ $limit: limit }] : []),
      {
        $lookup: {
          from: 'branches',
          localField: 'branchObj',
          foreignField: '_id',
          as: 'branchInfo'
        }
      },
      {
        $lookup: {
          from: 'states',
          localField: 'stateObj',
          foreignField: '_id',
          as: 'stateInfo'
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          phone: 1,
          totalInvited: 1,
          totalCheckedIn: 1,
          totalScore: 1,
          branch: { $arrayElemAt: ['$branchInfo.name', 0] },
          state: { $arrayElemAt: ['$stateInfo.name', 0] },
          attendanceRate: {
            $cond: [
              { $gt: ['$totalInvited', 0] },
              { $multiply: [{ $divide: ['$totalCheckedIn', '$totalInvited'] }, 100] },
              0
            ]
          }
        }
      }
    ]);
    return rankings.map((worker, index) => ({
      ...worker,
      rank: index + 1,
      medal: this.getMedal(index + 1)
    }));
  }

  /**
   * Calculate branch rankings within a state
   */
  async getBranchRankings(stateId?: string, limit?: number): Promise<any[]> {
    let matchQuery: any = {};
    if (stateId) {
      matchQuery.stateId = new Types.ObjectId(stateId);
    }
    const rankings = await this.branchModel.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: 'users',
          let: { branchId: '$_id' },
          pipeline: [
            { $addFields: { branchObj: { $toObjectId: '$branch' } } },
            { $match: { $expr: { $and: [
              { $eq: ['$role', Role.WORKER] },
              { $eq: ['$branchObj', '$$branchId'] }
            ] } } }
          ],
          as: 'workers'
        }
      },
      {
        $addFields: {
          workerIds: '$workers._id',
          workersCount: { $size: '$workers' }
        }
      },
      {
        $lookup: {
          from: 'guests',
          let: { branchWorkers: '$workerIds' },
          pipeline: [
            { $match: { $expr: { $in: ['$registeredBy', '$$branchWorkers'] } } }
          ],
          as: 'allGuests'
        }
      },
      {
        $lookup: {
          from: 'guests',
          let: { branchWorkers: '$workerIds' },
          pipeline: [
            { $match: { $expr: { $and: [
              { $in: ['$registeredBy', '$$branchWorkers'] },
              { $eq: ['$status', 'checked_in'] }
            ]}}
            }
          ],
          as: 'checkedInGuests'
        }
      },
      {
        $addFields: {
          totalInvited: { $size: '$allGuests' },
          totalCheckedIn: { $size: '$checkedInGuests' },
          totalScore: { $add: [{ $size: '$allGuests' }, { $size: '$checkedInGuests' }] },
          workersCount: { $size: '$workers' }
        }
      },
      { $sort: { totalScore: -1, totalInvited: -1 } },
      ...(limit ? [{ $limit: limit }] : []),
      {
        $lookup: {
          from: 'states',
          localField: 'stateId',
          foreignField: '_id',
          as: 'stateInfo'
        }
      },
      {
        $project: {
          name: 1,
          location: 1,
          totalInvited: 1,
          totalCheckedIn: 1,
          totalScore: 1,
          workersCount: 1,
          state: { $arrayElemAt: ['$stateInfo.name', 0] },
          attendanceRate: {
            $cond: [
              { $gt: ['$totalInvited', 0] },
              { $multiply: [{ $divide: ['$totalCheckedIn', '$totalInvited'] }, 100] },
              0
            ]
          }
        }
      }
    ]);
    return rankings.map((branch, index) => ({
      ...branch,
      rank: index + 1,
      medal: this.getMedal(index + 1)
    }));
  }

  /**
   * Calculate state rankings (national level)
   */
  async getStateRankings(limit?: number): Promise<any[]> {
    const totalStates = await this.stateModel.countDocuments({ isActive: true }).exec();
    const rankings = await this.stateModel.aggregate([
      { $match: { isActive: true } },
      {
        $lookup: {
          from: 'users',
          let: { stateId: '$_id' },
          pipeline: [
            { $addFields: { stateObj: { $toObjectId: '$state' } } },
            { $match: { $expr: { $and: [
              { $eq: ['$role', Role.WORKER] },
              { $eq: ['$stateObj', '$$stateId'] }
            ] } } }
          ],
          as: 'workers'
        }
      },
      {
        $addFields: {
          workerIds: '$workers._id',
          workersCount: { $size: '$workers' }
        }
      },
      {
        $lookup: {
          from: 'guests',
          let: { stateWorkers: '$workerIds' },
          pipeline: [
            { $match: { $expr: { $in: ['$registeredBy', '$$stateWorkers'] } } }
          ],
          as: 'allGuests'
        }
      },
      {
        $lookup: {
          from: 'guests',
          let: { stateWorkers: '$workerIds' },
          pipeline: [
            { $match: { $expr: { $and: [
              { $in: ['$registeredBy', '$$stateWorkers'] },
              { $eq: ['$status', 'checked_in'] }
            ]}}
            }
          ],
          as: 'checkedInGuests'
        }
      },
      {
        $addFields: {
          totalInvited: { $size: '$allGuests' },
          totalCheckedIn: { $size: '$checkedInGuests' },
          totalScore: { $add: [{ $size: '$allGuests' }, { $size: '$checkedInGuests' }] },
          workersCount: { $size: '$workers' }
        }
      },
      { $sort: { totalScore: -1, totalInvited: -1 } },
      ...(limit ? [{ $limit: limit }] : []),
      {
        $project: {
          name: 1,
          code: 1,
          totalInvited: 1,
          totalCheckedIn: 1,
          totalScore: 1,
          workersCount: 1,
          attendanceRate: {
            $cond: [
              { $gt: ['$totalInvited', 0] },
              { $multiply: [{ $divide: ['$totalCheckedIn', '$totalInvited'] }, 100] },
              0
            ]
          }
        }
      }
    ]);
    return rankings.map((state, index) => ({
      ...state,
      rank: index + 1,
      medal: this.getMedal(index + 1)
    }));
  }

  /**
   * Get medal for ranking position
   */
  private getMedal(rank: number): string {
    switch (rank) {
      case 1: return 'platinum';
      case 2: return 'gold';
      case 3: return 'silver';
      default: return '';
    }
  }
}

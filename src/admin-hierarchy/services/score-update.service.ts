import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../../schemas/user.schema';
import { Guest, GuestDocument } from '../../schemas/guest.schema';
import { State, StateDocument } from '../../schemas/state.schema';
import { Branch, BranchDocument } from '../../schemas/branch.schema';
import { Role } from '../../common/enums/role.enum';

/**
 * Service for updating score fields in all schemas
 */
@Injectable()
export class ScoreUpdateService {
  private readonly logger = new Logger(ScoreUpdateService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Guest.name) private guestModel: Model<GuestDocument>,
    @InjectModel(State.name) private stateModel: Model<StateDocument>,
    @InjectModel(Branch.name) private branchModel: Model<BranchDocument>,
  ) {}

  /**
   * Update scores for all workers
   */
  async updateWorkerScores(): Promise<void> {
    this.logger.log('Starting worker score updates...');
    const workers = await this.userModel.find({ role: Role.WORKER }).exec();
    for (const worker of workers) {
      // Always ensure ObjectId for query
      const workerId = typeof worker._id === 'string' ? new Types.ObjectId(worker._id) : worker._id;
      // Defensive: also check guestModel for string or ObjectId
      const totalInvited = await this.guestModel.countDocuments({ registeredBy: { $in: [workerId, workerId.toString()] } }).exec();
      const totalCheckedIn = await this.guestModel.countDocuments({ registeredBy: { $in: [workerId, workerId.toString()] }, status: 'checked_in' }).exec();
      const totalScore = totalInvited + totalCheckedIn;
      await this.userModel.updateOne(
        { _id: workerId },
        {
          totalInvitedGuests: totalInvited,
          totalCheckedInGuests: totalCheckedIn,
          totalScore
        }
      );
    }
    this.logger.log(`Updated scores for ${workers.length} workers`);
  }

  /**
   * Update scores for all branches
   */
  async updateBranchScores(): Promise<void> {
    this.logger.log('Starting branch score updates...');
    const branches = await this.branchModel.find().exec();
    for (const branch of branches) {
      const branchId = typeof branch._id === 'string' ? new Types.ObjectId(branch._id) : branch._id;
      const guests = await this.guestModel.find({ branch: branchId }).exec();
      const totalInvited = guests.length;
      const totalCheckedIn = guests.filter(g => g.status === 'checked_in').length;
      const uniqueWorkerIds = new Set(guests.map(g => g.registeredBy?.toString()));
      const workersCount = uniqueWorkerIds.size;
      await this.branchModel.updateOne(
        { _id: branchId },
        {
          totalInvitedGuests: totalInvited,
          totalCheckedInGuests: totalCheckedIn,
          totalScore: totalInvited + totalCheckedIn,
          workersCount
        }
      );
    }
    this.logger.log(`Updated scores for ${branches.length} branches`);
  }

  /**
   * Update scores for all states
   */
  async updateStateScores(): Promise<void> {
    this.logger.log('Starting state score updates...');
    const states = await this.stateModel.find().exec();
    for (const state of states) {
      const stateId = typeof state._id === 'string' ? new Types.ObjectId(state._id) : state._id;
      const guests = await this.guestModel.find({ state: stateId }).exec();
      const totalInvited = guests.length;
      const totalCheckedIn = guests.filter(g => g.status === 'checked_in').length;
      const uniqueWorkerIds = new Set(guests.map(g => g.registeredBy?.toString()));
      const workersCount = uniqueWorkerIds.size;
      const branchesCount = await this.branchModel.countDocuments({ stateId: stateId }).exec();
      await this.stateModel.updateOne(
        { _id: stateId },
        {
          totalInvitedGuests: totalInvited,
          totalCheckedInGuests: totalCheckedIn,
          totalScore: totalInvited + totalCheckedIn,
          workersCount,
          branchesCount
        }
      );
    }
    this.logger.log(`Updated scores for ${states.length} states`);
  }

  /**
   * Update all scores (workers, branches, states)
   */
  async updateAllScores(): Promise<void> {
    this.logger.log('Starting complete score update...');
    
    try {
      await this.updateWorkerScores();
      await this.updateBranchScores();
      await this.updateStateScores();
      
      this.logger.log('Complete score update finished successfully');
    } catch (error) {
      this.logger.error('Error during score update:', error);
      throw error;
    }
  }

  /**
   * Update scores for a specific worker and their associated branch and state
   * @param workerId - ID of the worker to update scores for
   */
  async updateScoresForWorker(workerId: string): Promise<void> {
    // Update worker's score
    const worker = await this.userModel.findById(workerId);
    if (!worker) return;
    const workerObjId = typeof worker._id === 'string' ? new Types.ObjectId(worker._id) : worker._id;
    const totalInvited = await this.guestModel.countDocuments({ registeredBy: workerObjId });
    const totalCheckedIn = await this.guestModel.countDocuments({ registeredBy: workerObjId, status: 'checked_in' });
    const totalScore = totalInvited + totalCheckedIn;
    await this.userModel.updateOne(
      { _id: workerObjId },
      {
        totalInvitedGuests: totalInvited,
        totalCheckedInGuests: totalCheckedIn,
        totalScore
      }
    );
    // Update branch's score
    if (worker.branch) {
      const branchWorkers = await this.userModel.find({ role: Role.WORKER, branch: worker.branch });
      // Ensure all branchWorkerIds are ObjectId
      const branchWorkerIds = branchWorkers.map(w => typeof w._id === 'string' ? new Types.ObjectId(w._id) : w._id);
      const branchTotalInvited = await this.guestModel.countDocuments({ registeredBy: { $in: branchWorkerIds } });
      const branchTotalCheckedIn = await this.guestModel.countDocuments({ registeredBy: { $in: branchWorkerIds }, status: 'checked_in' });
      const branchTotalScore = branchTotalInvited + branchTotalCheckedIn;
      await this.branchModel.updateOne(
        { _id: worker.branch },
        {
          totalInvitedGuests: branchTotalInvited,
          totalCheckedInGuests: branchTotalCheckedIn,
          totalScore: branchTotalScore,
          workersCount: branchWorkers.length
        }
      );
      // Update state's score
      const branch = await this.branchModel.findById(worker.branch);
      if (branch && branch.stateId) {
        const stateWorkers = await this.userModel.find({ role: Role.WORKER, state: branch.stateId });
        // Ensure all stateWorkerIds are ObjectId
        const stateWorkerIds = stateWorkers.map(w => typeof w._id === 'string' ? new Types.ObjectId(w._id) : w._id);
        const stateTotalInvited = await this.guestModel.countDocuments({ registeredBy: { $in: stateWorkerIds } });
        const stateTotalCheckedIn = await this.guestModel.countDocuments({ registeredBy: { $in: stateWorkerIds }, status: 'checked_in' });
        const stateTotalScore = stateTotalInvited + stateTotalCheckedIn;
        const branchesCount = await this.branchModel.countDocuments({ stateId: branch.stateId });
        await this.stateModel.updateOne(
          { _id: branch.stateId },
          {
            totalInvitedGuests: stateTotalInvited,
            totalCheckedInGuests: stateTotalCheckedIn,
            totalScore: stateTotalScore,
            workersCount: stateWorkers.length,
            branchesCount
          }
        );
      }
    }
  }
}

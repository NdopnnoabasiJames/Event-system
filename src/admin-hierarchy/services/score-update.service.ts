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
      const totalInvited = await this.guestModel
        .countDocuments({ registeredBy: worker._id })
        .exec();
      
      const totalCheckedIn = await this.guestModel
        .countDocuments({ registeredBy: worker._id, status: 'checked_in' })
        .exec();
      
      const totalScore = totalInvited + totalCheckedIn;
      
      await this.userModel.updateOne(
        { _id: worker._id },
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
      // Get all workers in this branch
      const workers = await this.userModel
        .find({ role: Role.WORKER, branch: branch._id })
        .exec();
      
      const workerIds = workers.map(w => w._id);
      
      const totalInvited = await this.guestModel
        .countDocuments({ registeredBy: { $in: workerIds } })
        .exec();
      
      const totalCheckedIn = await this.guestModel
        .countDocuments({ registeredBy: { $in: workerIds }, status: 'checked_in' })
        .exec();
      
      const totalScore = totalInvited + totalCheckedIn;
      
      await this.branchModel.updateOne(
        { _id: branch._id },
        {
          totalInvitedGuests: totalInvited,
          totalCheckedInGuests: totalCheckedIn,
          totalScore,
          workersCount: workers.length
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
      // Get all workers in this state
      const workers = await this.userModel
        .find({ role: Role.WORKER, state: state._id })
        .exec();
      
      const workerIds = workers.map(w => w._id);
      
      const totalInvited = await this.guestModel
        .countDocuments({ registeredBy: { $in: workerIds } })
        .exec();
      
      const totalCheckedIn = await this.guestModel
        .countDocuments({ registeredBy: { $in: workerIds }, status: 'checked_in' })
        .exec();
      
      const totalScore = totalInvited + totalCheckedIn;
      
      // Count branches in this state
      const branchesCount = await this.branchModel
        .countDocuments({ stateId: state._id })
        .exec();
      
      await this.stateModel.updateOne(
        { _id: state._id },
        {
          totalInvitedGuests: totalInvited,
          totalCheckedInGuests: totalCheckedIn,
          totalScore,
          workersCount: workers.length,
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
}

import { Injectable, NotFoundException, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Event, EventDocument } from '../../schemas/event.schema';
import { User, UserDocument } from '../../schemas/user.schema';

@Injectable()
export class WorkerVolunteerService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  /**
   * Get all published events for workers to volunteer for
   */
  async getPublishedEvents(): Promise<EventDocument[]> {
    try {
      return await this.eventModel
        .find({ 
          status: 'published',
          isActive: true 
        })
        .populate({
          path: 'selectedBranches',
          select: 'name location',
          populate: {
            path: 'stateId',
            select: 'name',
            model: 'State'
          }
        })
        .populate({
          path: 'availableStates',
          select: 'name'
        })
        .exec();
    } catch (error) {
      throw new HttpException(`Failed to get published events: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get events where worker has been approved to volunteer
   */
  async getWorkerApprovedEvents(workerId: string): Promise<EventDocument[]> {
    try {
      return await this.eventModel
        .find({ 
          workers: workerId,
          isActive: true 
        })
        .populate({
          path: 'selectedBranches',
          select: 'name location',
          populate: {
            path: 'stateId',
            select: 'name',
            model: 'State'
          }
        })
        .populate({
          path: 'availableStates',
          select: 'name'
        })
        .exec();
    } catch (error) {
      throw new HttpException(`Failed to get worker approved events: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Check worker's volunteer status for an event
   */
  async getVolunteerStatus(eventId: string, workerId: string): Promise<{ status: 'none' | 'pending' | 'approved' | 'rejected' }> {
    try {
      const event = await this.eventModel.findById(eventId).exec();
      if (!event) {
        throw new NotFoundException('Event not found');
      }

      // Check if already in workers array (approved)
      if (event.workers.includes(workerId as any)) {
        return { status: 'approved' };
      }

      // Check volunteer requests
      const volunteerRequest = event.volunteerRequests?.find(
        req => req.workerId.toString() === workerId
      );

      if (volunteerRequest) {
        return { status: volunteerRequest.status as any };
      }

      return { status: 'none' };
    } catch (error) {
      throw new HttpException(`Failed to check volunteer status: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Submit volunteer request for an event
   */
  async volunteerForEvent(eventId: string, workerId: string): Promise<{ message: string; status: string }> {
    try {
      const event = await this.eventModel.findById(eventId).exec();
      if (!event) {
        throw new NotFoundException('Event not found');
      }

      const worker = await this.userModel.findById(workerId).populate('branch').exec();
      if (!worker) {
        throw new NotFoundException('Worker not found');
      }

      // Check if already volunteered
      const existingRequest = event.volunteerRequests?.find(
        req => req.workerId.toString() === workerId
      );
      
      if (existingRequest || event.workers.includes(workerId as any)) {
        throw new BadRequestException('Already volunteered for this event');
      }      // Check if event is in worker's own branch
      const workerBranchId = worker.branch?._id?.toString() || worker.branch?.toString();
      const isOwnBranch = event.selectedBranches?.some(
        branchId => branchId.toString() === workerBranchId
      ) || false;

      if (isOwnBranch) {
        // Auto-approve for own branch
        await this.eventModel.findByIdAndUpdate(
          eventId,
          { $addToSet: { workers: workerId } }
        );
        return { message: 'Successfully volunteered for event', status: 'approved' };
      } else {
        // Add to volunteer requests for other branches
        await this.eventModel.findByIdAndUpdate(
          eventId,
          {
            $push: {
              volunteerRequests: {
                workerId: workerId,
                status: 'pending',
                requestedAt: new Date()
              }
            }
          }
        );
        return { message: 'Volunteer request submitted for approval', status: 'pending' };
      }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new HttpException(`Failed to volunteer for event: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

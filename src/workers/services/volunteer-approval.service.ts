import { Injectable, NotFoundException, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Event, EventDocument } from '../../schemas/event.schema';
import { User, UserDocument } from '../../schemas/user.schema';

@Injectable()
export class VolunteerApprovalService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}  /**
   * Get pending volunteer requests for events created by or assigned to a branch admin
   */
  async getPendingVolunteerRequests(branchAdminId: string): Promise<any[]> {
    try {
      const branchAdmin = await this.userModel.findById(branchAdminId).populate('branch').exec();
      if (!branchAdmin) {
        throw new NotFoundException('Branch admin not found');
      }

      const branchId = branchAdmin.branch?._id?.toString() || branchAdmin.branch?.toString();
      if (!branchId) {
        throw new BadRequestException('Branch admin has no assigned branch');
      }      // Find events in this branch that have pending volunteer requests from workers in OTHER branches
      const events = await this.eventModel
        .find({
          'volunteerRequests.status': 'pending',
          'selectedBranches': branchId  // Only events in this admin's branch
        })
        .populate({
          path: 'volunteerRequests.workerId',
          select: 'name email branch',
          populate: {
            path: 'branch',
            select: 'name'
          }
        })
        .select('name date volunteerRequests selectedBranches')
        .exec();

      // Extract only pending requests from workers in OTHER branches
      const pendingRequests = [];
      events.forEach(event => {
        event.volunteerRequests
          .filter(req => req.status === 'pending')          .filter(req => {
            // Only include requests from workers in OTHER branches (not this admin's branch)
            const worker = req.workerId as any;
            const workerBranchId = worker?.branch?._id?.toString() || worker?.branch?.toString();
            return workerBranchId !== branchId; // Different branch
          })
          .forEach(req => {
            pendingRequests.push({
              requestId: req._id,
              eventId: event._id,
              eventName: event.name,
              eventDate: event.date,
              worker: req.workerId,
              requestedAt: req.requestedAt,
              status: req.status
            });
          });
      });

      return pendingRequests;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new HttpException(`Failed to get pending requests: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Approve or reject a volunteer request
   */
  async reviewVolunteerRequest(
    eventId: string,
    requestId: string,
    adminId: string,
    action: 'approve' | 'reject'
  ): Promise<{ message: string }> {
    try {
      const event = await this.eventModel.findById(eventId).exec();
      if (!event) {
        throw new NotFoundException('Event not found');
      }

      // Find the specific volunteer request
      const requestIndex = event.volunteerRequests.findIndex(
        req => req._id?.toString() === requestId
      );

      if (requestIndex === -1) {
        throw new NotFoundException('Volunteer request not found');
      }

      const volunteerRequest = event.volunteerRequests[requestIndex];
      
      if (volunteerRequest.status !== 'pending') {
        throw new BadRequestException('Request has already been reviewed');
      }

      // Update the request status
      volunteerRequest.status = action === 'approve' ? 'approved' : 'rejected';
      volunteerRequest.reviewedAt = new Date();
      volunteerRequest.reviewedBy = adminId as any;

      // If approved, add worker to the workers array
      if (action === 'approve') {
        if (!event.workers.includes(volunteerRequest.workerId)) {
          event.workers.push(volunteerRequest.workerId);
        }
      }

      await event.save();

      return {
        message: `Volunteer request ${action === 'approve' ? 'approved' : 'rejected'} successfully`
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new HttpException(`Failed to review volunteer request: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get volunteer request statistics for a branch admin
   */
  async getVolunteerRequestStats(branchAdminId: string): Promise<{
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  }> {
    try {
      const branchAdmin = await this.userModel.findById(branchAdminId).populate('branch').exec();
      if (!branchAdmin) {
        throw new NotFoundException('Branch admin not found');
      }

      const branchId = branchAdmin.branch?._id?.toString() || branchAdmin.branch?.toString();
      
      const events = await this.eventModel
        .find({
          selectedBranches: branchId,
          volunteerRequests: { $exists: true, $not: { $size: 0 } }
        })
        .select('volunteerRequests')
        .exec();

      let pending = 0, approved = 0, rejected = 0;
      
      events.forEach(event => {
        event.volunteerRequests.forEach(req => {
          switch (req.status) {
            case 'pending': pending++; break;
            case 'approved': approved++; break;
            case 'rejected': rejected++; break;
          }
        });
      });

      return {
        pending,
        approved,
        rejected,
        total: pending + approved + rejected
      };
    } catch (error) {
      throw new HttpException(`Failed to get volunteer stats: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get approved event workers organized by event for a branch admin
   */
  async getApprovedEventWorkers(branchAdminId: string): Promise<any[]> {
    try {
      const branchAdmin = await this.userModel.findById(branchAdminId).populate('branch').exec();
      if (!branchAdmin) {
        throw new NotFoundException('Branch admin not found');
      }

      const branchId = branchAdmin.branch?._id?.toString() || branchAdmin.branch?.toString();
      if (!branchId) {
        throw new BadRequestException('Branch admin has no assigned branch');
      }      // Find events in this branch that have approved workers from OTHER branches
      const events = await this.eventModel
        .find({
          workers: { $exists: true, $not: { $size: 0 } },
          'selectedBranches': branchId  // Only events in this admin's branch
        })
        .populate({
          path: 'workers',
          select: 'name email branch',
          populate: {
            path: 'branch',
            select: 'name'
          }
        })
        .select('name date workers')
        .exec();

      // Group workers by event, filtering only workers from OTHER branches
      const eventWorkers = [];
      events.forEach(event => {
        const externalWorkers = event.workers.filter(worker => {
          const workerObj = worker as any;
          const workerBranchId = workerObj?.branch?._id?.toString() || workerObj?.branch?.toString();
          return workerBranchId !== branchId; // Different branch
        });

        if (externalWorkers.length > 0) {
          eventWorkers.push({
            eventId: event._id,
            eventName: event.name,
            eventDate: event.date,
            workers: externalWorkers.map(worker => ({
              id: (worker as any)._id,
              name: (worker as any).name,
              email: (worker as any).email,
              branch: (worker as any).branch
            }))
          });
        }
      });

      return eventWorkers;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new HttpException(`Failed to get approved event workers: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

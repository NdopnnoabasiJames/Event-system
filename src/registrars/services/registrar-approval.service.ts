import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Event, EventDocument } from '../../schemas/event.schema';
import { User, UserDocument } from '../../schemas/user.schema';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class RegistrarApprovalService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async getPendingRegistrarRequests(adminId: string): Promise<any[]> {
    try {
      // Get the admin to determine their branch
      const admin = await this.userModel.findById(adminId).exec();
      if (!admin) {
        throw new NotFoundException('Admin not found');
      }

      // Only branch admins can approve registrar requests
      if (admin.role !== Role.BRANCH_ADMIN) {
        throw new ForbiddenException('Only branch admins can view pending registrar requests');
      }

      const adminBranchId = admin.branch?.toString();
      if (!adminBranchId) {
        throw new BadRequestException('Admin must be assigned to a branch');
      }

      // Find events in the admin's branch that have pending registrar requests
      const events = await this.eventModel
        .find({
          'registrarRequests.status': 'pending',
          'selectedBranches': adminBranchId  // Only events in this admin's branch
        })
        .populate({
          path: 'registrarRequests.registrarId',
          select: 'name email phone branch',
          populate: {
            path: 'branch',
            select: 'name'
          }
        })
        .populate('selectedBranches', 'name')
        .select('name description date registrationDeadline status registrarRequests selectedBranches')
        .exec();

      // Format the response to include only pending requests from registrars in OTHER branches
      const pendingRequests = [];
      
      events.forEach(event => {
        event.registrarRequests
          .filter(req => req.status === 'pending')
          .filter(req => {
            // Only include requests from registrars in OTHER branches (not this admin's branch)
            const registrar = req.registrarId as any;
            const registrarBranchId = registrar?.branch?._id?.toString() || registrar?.branch?.toString();
            return registrarBranchId !== adminBranchId; // Different branch
          })
          .forEach(request => {
            pendingRequests.push({
              requestId: request._id,
              event: {
                id: event._id,
                name: event.name,
                description: event.description,
                date: event.date,
                registrationDeadline: event.registrationDeadline,
                status: event.status,
                selectedBranches: event.selectedBranches
              },
              registrar: request.registrarId,
              requestedAt: request.requestedAt,
              status: request.status
            });
          });
      });

      return pendingRequests;
    } catch (error) {
      throw new BadRequestException(`Failed to get pending registrar requests: ${error.message}`);
    }
  }

  async approveRegistrarRequest(adminId: string, eventId: string, registrarId: string): Promise<{ message: string }> {
    try {
      // Get the admin to verify permissions
      const admin = await this.userModel.findById(adminId).exec();
      if (!admin) {
        throw new NotFoundException('Admin not found');
      }

      if (admin.role !== Role.BRANCH_ADMIN) {
        throw new ForbiddenException('Only branch admins can approve registrar requests');
      }

      const adminBranchId = admin.branch?.toString();
      if (!adminBranchId) {
        throw new BadRequestException('Admin must be assigned to a branch');
      }

      // Find the event
      const event = await this.eventModel.findById(eventId).exec();
      if (!event) {
        throw new NotFoundException('Event not found');
      }

      // Verify the event belongs to the admin's branch
      if (!event.selectedBranches?.includes(new Types.ObjectId(adminBranchId))) {
        throw new ForbiddenException('Can only approve requests for events in your branch');
      }

      // Find the registrar request
      const requestIndex = event.registrarRequests?.findIndex(
        req => req.registrarId.toString() === registrarId && req.status === 'pending'
      );

      if (requestIndex === -1 || requestIndex === undefined) {
        throw new NotFoundException('Pending registrar request not found');
      }

      // Update the request status
      event.registrarRequests[requestIndex].status = 'approved';
      event.registrarRequests[requestIndex].reviewedAt = new Date();
      event.registrarRequests[requestIndex].reviewedBy = new Types.ObjectId(adminId);

      await event.save();

      return {
        message: 'Registrar request approved successfully'
      };
    } catch (error) {
      throw new BadRequestException(`Failed to approve registrar request: ${error.message}`);
    }
  }

  async rejectRegistrarRequest(adminId: string, eventId: string, registrarId: string, reason?: string): Promise<{ message: string }> {
    try {
      // Get the admin to verify permissions
      const admin = await this.userModel.findById(adminId).exec();
      if (!admin) {
        throw new NotFoundException('Admin not found');
      }

      if (admin.role !== Role.BRANCH_ADMIN) {
        throw new ForbiddenException('Only branch admins can reject registrar requests');
      }

      const adminBranchId = admin.branch?.toString();
      if (!adminBranchId) {
        throw new BadRequestException('Admin must be assigned to a branch');
      }

      // Find the event
      const event = await this.eventModel.findById(eventId).exec();
      if (!event) {
        throw new NotFoundException('Event not found');
      }

      // Verify the event belongs to the admin's branch
      if (!event.selectedBranches?.includes(new Types.ObjectId(adminBranchId))) {
        throw new ForbiddenException('Can only reject requests for events in your branch');
      }

      // Find the registrar request
      const requestIndex = event.registrarRequests?.findIndex(
        req => req.registrarId.toString() === registrarId && req.status === 'pending'
      );

      if (requestIndex === -1 || requestIndex === undefined) {
        throw new NotFoundException('Pending registrar request not found');
      }

      // Update the request status
      event.registrarRequests[requestIndex].status = 'rejected';
      event.registrarRequests[requestIndex].reviewedAt = new Date();
      event.registrarRequests[requestIndex].reviewedBy = new Types.ObjectId(adminId);

      await event.save();

      return {
        message: 'Registrar request rejected successfully'
      };
    } catch (error) {
      throw new BadRequestException(`Failed to reject registrar request: ${error.message}`);
    }
  }
}

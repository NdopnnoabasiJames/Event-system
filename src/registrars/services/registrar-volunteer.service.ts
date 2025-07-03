import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Event, EventDocument } from '../../schemas/event.schema';
import { User, UserDocument } from '../../schemas/user.schema';

@Injectable()
export class RegistrarVolunteerService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async volunteerForEvent(registrarId: string, eventId: string): Promise<{ message: string; status: string }> {
    try {
      // Find the registrar
      const registrar = await this.userModel.findById(registrarId).exec();
      if (!registrar) {
        throw new NotFoundException('Registrar not found');
      }

      // Find the event
      const event = await this.eventModel.findById(eventId).exec();
      if (!event) {
        throw new NotFoundException('Event not found');
      }

      // Check if registrar already volunteered
      const existingRequest = event.registrarRequests?.find(
        req => req.registrarId.toString() === registrarId
      );

      if (existingRequest) {
        return {
          message: 'Already volunteered for this event',
          status: existingRequest.status
        };
      }

      // Determine approval status based on event location
      let approvalStatus = 'pending';
      let message = 'Volunteer request submitted successfully';

      // Auto-approve if:
      // 1. Event is in registrar's own branch (selectedBranches includes registrar's branch)
      // 2. Event is global/national (no selectedBranches or empty selectedBranches)
      const registrarBranchId = registrar.branch?.toString();

      console.log('DEBUG: Volunteer approval logic');
      console.log('DEBUG: Registrar branch ID:', registrarBranchId);
      console.log('DEBUG: Event selectedBranches:', event.selectedBranches);
      console.log('DEBUG: Event selectedBranches length:', event.selectedBranches?.length);

      if (!event.selectedBranches || event.selectedBranches.length === 0) {
        // Global/National event - auto approve
        approvalStatus = 'approved';
        message = 'Volunteer request approved automatically (national event)';
        console.log('DEBUG: Auto-approved - National event');
      } else if (event.selectedBranches.length > 0) {
        // Check if registrar's branch is in the selected branches
        const isInSelectedBranches = event.selectedBranches.some(
          branchId => branchId.toString() === registrarBranchId
        );
        console.log('DEBUG: Is in selected branches:', isInSelectedBranches);
        if (isInSelectedBranches) {
          approvalStatus = 'approved';
          message = 'Volunteer request approved automatically (branch included in event)';
          console.log('DEBUG: Auto-approved - Branch included');
        } else {
          console.log('DEBUG: Requires approval - Branch not included');
        }
      }

      // Add volunteer request
      if (!event.registrarRequests) {
        event.registrarRequests = [];
      }

      event.registrarRequests.push({
        registrarId: registrarId as any,
        status: approvalStatus,
        requestedAt: new Date(),
        ...(approvalStatus === 'approved' && { approvedAt: new Date() })
      });

      await event.save();

      return {
        message,
        status: approvalStatus
      };
    } catch (error) {
      throw new BadRequestException(`Failed to volunteer for event: ${error.message}`);
    }
  }

  async getRegistrarEvents(registrarId: string): Promise<EventDocument[]> {
    try {
      // Get all published events
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
        .populate('registrarRequests.registrarId', 'name email')
        .exec();
    } catch (error) {
      throw new BadRequestException(`Failed to get events: ${error.message}`);
    }
  }

  async getMyEvents(registrarId: string): Promise<EventDocument[]> {
    try {
      // Get events where registrar is approved
      return await this.eventModel
        .find({ 
          'registrarRequests.registrarId': registrarId,
          'registrarRequests.status': 'approved',
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
      throw new BadRequestException(`Failed to get my events: ${error.message}`);
    }
  }

  async getRegistrarStats(registrarId: string): Promise<any> {
    try {
      // Count total events volunteered for
      const totalEventsVolunteered = await this.eventModel.countDocuments({
        'registrarRequests.registrarId': registrarId
      });

      // Count approved events
      const approvedEvents = await this.eventModel.countDocuments({
        'registrarRequests.registrarId': registrarId,
        'registrarRequests.status': 'approved'
      });

      // Count total guests checked in by this registrar
      const totalCheckedInGuests = await this.eventModel.aggregate([
        { $match: { 'registrarRequests.registrarId': registrarId, 'registrarRequests.status': 'approved' } },
        { $lookup: { from: 'guests', localField: '_id', foreignField: 'event', as: 'guests' } },
        { $unwind: '$guests' },
        { $match: { 'guests.checkedInBy': registrarId, 'guests.isCheckedIn': true } },
        { $count: 'total' }
      ]);

      const checkedInCount = totalCheckedInGuests.length > 0 ? totalCheckedInGuests[0].total : 0;

      return {
        totalEventsVolunteered,
        approvedEvents,
        totalCheckedInGuests: checkedInCount
      };
    } catch (error) {
      throw new BadRequestException(`Failed to get registrar stats: ${error.message}`);
    }
  }
}

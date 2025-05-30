import { Injectable, HttpException, HttpStatus, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Event, EventDocument } from '../schemas/event.schema';
import { CreateEventDto } from './dto/create-event.dto';

@Injectable()
export class HierarchicalEventService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
  ) {}
  // Create event by Super Admin
  async createSuperAdminEvent(createEventDto: CreateEventDto, creatorId: string): Promise<EventDocument> {
    try {
      const eventData = {
        ...createEventDto,
        createdBy: new Types.ObjectId(creatorId),
        creatorLevel: 'super_admin',
        selectedStates: createEventDto.states || [],
        selectedBranches: [],
      };

      const event = new this.eventModel(eventData);
      return await event.save();
    } catch (error) {
      throw new HttpException(`Failed to create super admin event: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }  // Create event by State Admin
  async createStateAdminEvent(createEventDto: CreateEventDto, creatorId: string, stateAdminState: string): Promise<EventDocument> {
    try {
      const eventData = {
        ...createEventDto,
        createdBy: new Types.ObjectId(creatorId),
        creatorLevel: 'state_admin',
        selectedStates: [stateAdminState],
        selectedBranches: [], // State admins don't pre-select branches, they select them later
      };

      const event = new this.eventModel(eventData);
      return await event.save();
    } catch (error) {
      throw new HttpException(`Failed to create state admin event: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Create event by Branch Admin
  async createBranchAdminEvent(createEventDto: CreateEventDto, creatorId: string, branchAdminState: string, branchAdminBranch: string): Promise<EventDocument> {
    try {
      const eventData = {
        ...createEventDto,
        createdBy: new Types.ObjectId(creatorId),
        creatorLevel: 'branch_admin',
        selectedStates: [branchAdminState],
        selectedBranches: [branchAdminBranch],
      };

      const event = new this.eventModel(eventData);
      return await event.save();
    } catch (error) {
      throw new HttpException(`Failed to create branch admin event: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Get events for Super Admin (all events)
  async getSuperAdminEvents(): Promise<EventDocument[]> {
    try {
      return await this.eventModel.find().populate('createdBy', 'name email role').exec();
    } catch (error) {
      throw new HttpException(`Failed to get super admin events: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Get events for State Admin (events in their state + events they created)
  async getStateAdminEvents(stateAdminState: string): Promise<EventDocument[]> {
    try {
      return await this.eventModel.find({
        $or: [
          { selectedStates: stateAdminState },
          { creatorLevel: 'state_admin', selectedStates: stateAdminState },
          { creatorLevel: 'branch_admin', selectedStates: stateAdminState }
        ]
      }).populate('createdBy', 'name email role').exec();
    } catch (error) {
      throw new HttpException(`Failed to get state admin events: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Get events for Branch Admin (events in their branch + events they created)
  async getBranchAdminEvents(branchAdminState: string, branchAdminBranch: string): Promise<EventDocument[]> {
    try {
      return await this.eventModel.find({
        $or: [
          { selectedStates: branchAdminState, selectedBranches: branchAdminBranch },
          { creatorLevel: 'branch_admin', selectedStates: branchAdminState, selectedBranches: branchAdminBranch }
        ]
      }).populate('createdBy', 'name email role').exec();
    } catch (error) {
      throw new HttpException(`Failed to get branch admin events: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // State Admin selects branches for super admin created events
  async selectBranchesForEvent(eventId: string, selectedBranches: string[], stateAdminId: string, stateAdminState: string): Promise<EventDocument> {
    try {
      const event = await this.eventModel.findById(eventId);
      if (!event) {
        throw new NotFoundException('Event not found');
      }

      // Verify state admin can modify this event
      if (event.creatorLevel !== 'super_admin' || !event.selectedStates.includes(stateAdminState)) {
        throw new UnauthorizedException('You cannot modify this event');
      }

      event.selectedBranches = [...new Set([...event.selectedBranches, ...selectedBranches])];
      return await event.save();
    } catch (error) {
      throw new HttpException(`Failed to select branches: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Guest, GuestDocument } from '../schemas/guest.schema';
import { CreateGuestDto } from './dto/create-guest.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';
import { ScoreUpdateService } from '../admin-hierarchy/services/score-update.service';

@Injectable()
export class GuestsService {
  constructor(
    @InjectModel(Guest.name) private guestModel: Model<GuestDocument>,
    private readonly scoreUpdateService: ScoreUpdateService,
  ) {} 

  async create(createGuestDto: CreateGuestDto & { event: string; registeredBy: string }): Promise<GuestDocument> {
    try {
      const guest = new this.guestModel(createGuestDto);
      const savedGuest = await guest.save();
      // Update only affected worker, branch, and state
      await this.scoreUpdateService.updateScoresForWorker(savedGuest.registeredBy.toString());
      return savedGuest;
    } catch (error) {
      throw new HttpException(`Failed to create guest: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async findAll(): Promise<GuestDocument[]> {
    try {
      const guests = await this.guestModel
        .find()
        .populate('event')
        .populate('registeredBy', '-password')
        .exec();
      
      return guests;
    } catch (error) {
      throw new HttpException(`Failed to retrieve guests: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async findOne(id: string): Promise<GuestDocument> {
    const guest = await this.guestModel
      .findById(id)
      .populate('event')
      .populate('registeredBy', '-password')
      .exec();

    if (!guest) {
      throw new NotFoundException('Guest not found');
    }

    return guest;
  }

  async getCheckinsByRegistrar(eventId: string, registrarId: string, search?: string): Promise<GuestDocument[]> {
    try {
      const query: any = { 
        event: eventId, 
        checkedInBy: registrarId,
        checkedInTime: { $exists: true }
      };

      // Add search functionality
      if (search) {
        const searchRegex = new RegExp(search, 'i');
        query.$or = [
          { name: searchRegex },
          { email: searchRegex },
          { phone: searchRegex }
        ];
      }

      const guests = await this.guestModel
        .find(query)
        .populate('event')
        .populate('registeredBy', '-password')
        .populate('checkedInBy', '-password')
        .sort({ checkedInTime: -1 }) // Most recent check-ins first
        .exec();
      
      return guests;
    } catch (error) {
      throw new HttpException(`Failed to retrieve check-ins: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async findByQuery(query: any): Promise<GuestDocument[]> {
    try {
      const guests = await this.guestModel
        .find(query)
        .populate('event')
        .populate('registeredBy', '-password')
        .populate('checkedInBy', '-password')
        .exec();
      
      return guests;
    } catch (error) {
      throw new HttpException(`Failed to find guests by query: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async update(id: string, updateGuestDto: UpdateGuestDto): Promise<GuestDocument> {
    const guest = await this.guestModel
      .findByIdAndUpdate(id, updateGuestDto, { new: true })
      .populate('event')
      .populate('registeredBy', '-password')
      .exec();

    if (!guest) {
      throw new NotFoundException('Guest not found');
    }

    return guest;
  }

  async remove(id: string): Promise<GuestDocument> {
    const guest = await this.guestModel.findByIdAndDelete(id).exec();

    if (!guest) {
      throw new NotFoundException('Guest not found');
    }

    return guest;
  }

  async getEventGuests(eventId: string): Promise<GuestDocument[]> {
    try {
      const guests = await this.guestModel
        .find({ event: eventId })
        .populate('event')
        .populate('registeredBy', '-password')
        .populate('checkedInBy', '-password')
        .exec();
      
      return guests;
    } catch (error) {
      throw new HttpException(`Failed to retrieve event guests: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getGuestsByTransport(eventId: string, transport: 'bus' | 'private'): Promise<GuestDocument[]> {
    try {
      const guests = await this.guestModel
        .find({ 
          event: eventId,
          transportPreference: transport
        })
        .populate('event')
        .populate('registeredBy', '-password')
        .populate('checkedInBy', '-password')
        .populate('pickupStation')
        .exec();
      
      return guests;
    } catch (error) {
      throw new HttpException(`Failed to retrieve guests by transport: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getBusGuestsByPickup(eventId: string, pickupStationId: string): Promise<GuestDocument[]> {
    try {
      const guests = await this.guestModel
        .find({ 
          event: eventId,
          transportPreference: 'bus',
          pickupStation: pickupStationId
        })
        .populate('event')
        .populate('registeredBy', '-password')
        .populate('checkedInBy', '-password')
        .populate('pickupStation')
        .exec();
      
      return guests;
    } catch (error) {
      throw new HttpException(`Failed to retrieve bus guests by pickup: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async checkinGuest(guestId: string, registrarId: string): Promise<GuestDocument> {
    try {
      const guest = await this.guestModel
        .findByIdAndUpdate(
          guestId,
          {
            checkedIn: true,
            checkedInBy: registrarId,
            checkedInTime: new Date()
          },
          { new: true }
        )
        .populate('event')
        .populate('registeredBy', '-password')
        .populate('checkedInBy', '-password')
        .exec();

      if (!guest) {
        throw new NotFoundException('Guest not found');
      }
      // Update only affected worker, branch, and state
      await this.scoreUpdateService.updateScoresForWorker(guest.registeredBy.toString());
      return guest;
    } catch (error) {
      throw new HttpException(`Failed to check in guest: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getGuestsByRegistrar(registrarId: string, eventId?: string): Promise<GuestDocument[]> {
    try {
      const query: any = { registeredBy: registrarId };
      if (eventId) {
        query.event = eventId;
      }

      const guests = await this.guestModel
        .find(query)
        .populate('event')
        .populate('registeredBy', '-password')
        .populate('checkedInBy', '-password')
        .exec();
      
      return guests;
    } catch (error) {
      throw new HttpException(`Failed to retrieve guests by registrar: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Count total guests registered by a specific worker
  async countGuestsByWorker(workerId: string): Promise<number> {
    try {
      return await this.guestModel.countDocuments({ registeredBy: workerId }).exec();
    } catch (error) {
      throw new HttpException(`Failed to count guests by worker: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Count checked-in guests registered by a specific worker
  async countCheckedInGuestsByWorker(workerId: string): Promise<number> {
    try {
      return await this.guestModel.countDocuments({ 
        registeredBy: workerId, 
        isCheckedIn: true 
      }).exec();
    } catch (error) {      throw new HttpException(`Failed to count checked-in guests by worker: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Find all guests registered by a specific worker
  async findGuestsByWorker(workerId: string): Promise<GuestDocument[]> {
    try {
      return await this.guestModel
        .find({ registeredBy: workerId })        .populate({
          path: 'event',
          select: 'name title date time location description selectedBranches availableStates scope',
          populate: [
            {
              path: 'selectedBranches',
              select: 'name location',
              populate: {
                path: 'stateId',
                select: 'name',
                model: 'State'
              }
            },
            {
              path: 'availableStates',
              select: 'name',
              model: 'State'
            }
          ]
        })
        .populate('registeredBy', 'name email')
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      throw new HttpException(`Failed to find guests by worker: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Guest, GuestDocument } from '../schemas/guest.schema';
import { CreateGuestDto } from './dto/create-guest.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';

@Injectable()
export class GuestsService {
  constructor(
    @InjectModel(Guest.name) private guestModel: Model<GuestDocument>,
  ) {} 

  async create(createGuestDto: CreateGuestDto & { event: string; registeredBy: string }): Promise<GuestDocument> {
    try {
      const guest = new this.guestModel(createGuestDto);
      return await guest.save();
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
}

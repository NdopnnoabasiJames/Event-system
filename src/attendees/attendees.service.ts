import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Attendee, AttendeeDocument } from '../schemas/attendee.schema';
import { CreateAttendeeDto } from './dto/create-attendee.dto';
import { UpdateAttendeeDto } from './dto/update-attendee.dto';

@Injectable()
export class AttendeesService {
  constructor(
    @InjectModel(Attendee.name) private attendeeModel: Model<AttendeeDocument>,
  ) {} 

  async create(createAttendeeDto: CreateAttendeeDto & { event: string; registeredBy: string }): Promise<AttendeeDocument> {
  try {
    const attendee = new this.attendeeModel(createAttendeeDto);
    return await attendee.save();
  } catch (error) {
    throw new HttpException(`Failed to create attendee: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

  async findAll(): Promise<AttendeeDocument[]> {
  try {
    const attendees = await this.attendeeModel
      .find()
      .populate('event')
      .populate('registeredBy', '-password')
      .exec();
    
    return attendees;
  } catch (error) {
    throw new HttpException(`Failed to retrieve attendees: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

  async findOne(id: string): Promise<AttendeeDocument> {
    const attendee = await this.attendeeModel
      .findById(id)
      .populate('event')
      .populate('registeredBy', '-password')
      .exec();

    if (!attendee) {
      throw new NotFoundException('Attendee not found');
    }

    return attendee;
  }

  async getCheckinsByConciege(eventId: string, conciergeId: string, search?: string): Promise<AttendeeDocument[]> {
    try {      const query: any = { 
        event: eventId, 
        checkedInBy: conciergeId,
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

      const attendees = await this.attendeeModel
        .find(query)
        .populate('event')
        .populate('registeredBy', '-password')
        .populate('checkedInBy', '-password')
        .sort({ checkedInAt: -1 }) // Most recent check-ins first
        .exec();
      
      return attendees;
    } catch (error) {
      throw new HttpException(`Failed to retrieve check-ins: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async findByQuery(query: any): Promise<AttendeeDocument[]> {
  try {
    const attendees = await this.attendeeModel
      .find(query)
      .populate('event')
      .populate('registeredBy', '-password')
      .exec();
    
    return attendees;
  } catch (error) {
    throw new HttpException(`Failed to find attendees by query: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
  async update(id: string, updateAttendeeDto: UpdateAttendeeDto): Promise<AttendeeDocument> {
    const attendee = await this.attendeeModel
      .findByIdAndUpdate(id, updateAttendeeDto, { new: true })
      .populate('event')
      .populate('registeredBy', '-password')
      .exec();

    if (!attendee) {
      throw new NotFoundException('Attendee not found');
    }

    return attendee;
  }

  async remove(id: string): Promise<void> {
    const attendee = await this.attendeeModel.findByIdAndDelete(id).exec();

    if (!attendee) {
      throw new NotFoundException('Attendee not found');
    }
  }
  async getEventAttendees(eventId: string): Promise<AttendeeDocument[]> {
  try {
    const attendees = await this.attendeeModel
      .find({ event: eventId })
      .populate('registeredBy', '-password')
      .exec();

    // Return empty array instead of throwing an error if no attendees found
    return attendees || [];
  } catch (error) {
    throw new HttpException(`Failed to fetch event attendees: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

  async getMarketerAttendees(marketerId: string): Promise<AttendeeDocument[]> {
  try {
    const attendees = await this.attendeeModel
      .find({ registeredBy: marketerId })
      .populate('event')
      .exec();

    if (!attendees || attendees.length === 0) {
      throw new HttpException('No attendees found for this marketer', HttpStatus.NOT_FOUND);
    }

    return attendees;
  } catch (error) {
    throw new HttpException(`Failed to retrieve attendees: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

  async getAttendeesByTransport(eventId: string, transportType: 'bus' | 'private'): Promise<AttendeeDocument[]> {
  try {
    const attendees = await this.attendeeModel
      .find({ event: eventId, transportPreference: transportType })
      .populate('registeredBy', '-password')
      .exec();

    if (!attendees || attendees.length === 0) {
      throw new HttpException('No attendees found for the specified transport type', HttpStatus.NOT_FOUND);
    }

    return attendees;
  } catch (error) {
    throw new HttpException(`Failed to retrieve attendees: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
  async getBusAttendeesByPickup(eventId: string, pickupLocation: string): Promise<AttendeeDocument[]> {
  try {
    const attendees = await this.attendeeModel
      .find({
        event: eventId,
        transportPreference: 'bus',
        'busPickup.location': pickupLocation,
      })
      .populate('registeredBy', '-password')
      .exec();

    if (!attendees.length) {
      throw new HttpException('No attendees found for the specified pickup location', HttpStatus.NOT_FOUND);
    }

    return attendees;
  } catch (error) {
    throw new HttpException(`Failed to fetch bus attendees: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
}

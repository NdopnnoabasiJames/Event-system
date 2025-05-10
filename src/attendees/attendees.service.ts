import { Injectable, NotFoundException } from '@nestjs/common';
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
    const attendee = new this.attendeeModel(createAttendeeDto);
    return attendee.save();
  }

  async findAll(): Promise<AttendeeDocument[]> {
    return this.attendeeModel
      .find()
      .populate('event')
      .populate('registeredBy', '-password')
      .exec();
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

  async findByQuery(query: any): Promise<AttendeeDocument[]> {
    return this.attendeeModel
      .find(query)
      .populate('event')
      .populate('registeredBy', '-password')
      .exec();
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
    return this.attendeeModel
      .find({ event: eventId })
      .populate('registeredBy', '-password')
      .exec();
  }

  async getMarketerAttendees(marketerId: string): Promise<AttendeeDocument[]> {
    return this.attendeeModel
      .find({ registeredBy: marketerId })
      .populate('event')
      .exec();
  }

  async getAttendeesByTransport(eventId: string, transportType: 'bus' | 'private'): Promise<AttendeeDocument[]> {
    return this.attendeeModel
      .find({ event: eventId, transportPreference: transportType })
      .populate('registeredBy', '-password')
      .exec();
  }

  async getBusAttendeesByPickup(eventId: string, pickupLocation: string): Promise<AttendeeDocument[]> {
    return this.attendeeModel
      .find({
        event: eventId,
        transportPreference: 'bus',
        'busPickup.location': pickupLocation,
      })
      .populate('registeredBy', '-password')
      .exec();
  }
}

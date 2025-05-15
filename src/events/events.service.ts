import { HttpException, HttpStatus, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Schema as MongooseSchema, Types } from 'mongoose';
import { Event, EventDocument } from '../schemas/event.schema';
import { CreateEventDto } from './dto/create-event.dto';
import { Role } from '../common/enums/role.enum';
import { UsersService } from '../users/users.service';

@Injectable()
export class EventsService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    private usersService: UsersService,
  ) {}

  async create(createEventDto: CreateEventDto): Promise<EventDocument> {
  try {
    const event = new this.eventModel(createEventDto);
    return await event.save();
  } catch (error) {
    throw new HttpException(`Failed to create event: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

  async findAll(): Promise<EventDocument[]> {
  try {
    return await this.eventModel.find().populate('marketers', '-password').exec();
  } catch (error) {
    throw new HttpException(`Failed to retrieve events: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

  async findOne(id: string): Promise<EventDocument> {
    const event = await this.eventModel
      .findById(id)
      .populate('marketers', '-password')
      .exec();
    
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    return event;
  }
 async addBusPickup(eventId: string, location: string, departureTime: string): Promise<EventDocument> {
  try {
    const event = await this.findOne(eventId);
    if (!event) {
      throw new HttpException('Event not found', HttpStatus.NOT_FOUND);
    }

    event.busPickups = event.busPickups || [];
    event.busPickups.push({ 
      location, 
      departureTime, // departureTime is already a string
      maxCapacity: 50,
      currentCount: 0,
      notes: ''
    });

    return await event.save();
  } catch (error) {
    throw new HttpException(`Failed to add bus pickup: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

async addMarketerToEvent(eventId: string, marketerId: string): Promise<EventDocument> {
  const [event, marketer] = await Promise.all([
    this.findOne(eventId),
    this.usersService.findById(marketerId),
  ]);

  if (marketer.role !== Role.MARKETER) {
    throw new UnauthorizedException('Only marketers can be added to events');
  }

  if (!event.marketers) {
    event.marketers = [];
  }

  const marketerId_ObjId = new Types.ObjectId(marketerId);
  
  if (!event.marketers.some(m => m.toString() === marketerId_ObjId.toString())) {
    event.marketers.push(marketerId_ObjId);
    await Promise.all([
      event.save(),
      this.usersService.addEventParticipation(marketerId, eventId),
    ]);
  }

  return this.findOne(eventId);
}

  async removeMarketerFromEvent(eventId: string, marketerId: string): Promise<EventDocument> {
  try {
    const event = await this.findOne(eventId);
    if (!event) {
      throw new HttpException('Event not found', HttpStatus.NOT_FOUND);
    }

    const marketerId_ObjId = new Types.ObjectId(marketerId);
    event.marketers = event.marketers.filter(
      (id) => id.toString() !== marketerId_ObjId.toString()
    );

    await Promise.all([
      event.save(),
      this.usersService.removeEventParticipation(marketerId, eventId),
    ]);

    return this.findOne(eventId);
  } catch (error) {
    throw new HttpException(`Failed to remove marketer from event: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

 async getEventsByState(state: string): Promise<EventDocument[]> {
  try {
    const events = await this.eventModel
      .find({ state })
      .populate('marketers', '-password')
      .exec();

    if (!events || events.length === 0) {
      throw new HttpException('No events found for the specified state', HttpStatus.NOT_FOUND);
    }

    return events;
  } catch (error) {
    throw new HttpException(`Failed to get events by state: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

  async getActiveEvents(): Promise<EventDocument[]> {
  try {
    const events = await this.eventModel
      .find({ isActive: true })
      .populate('marketers', '-password')
      .exec();

    if (!events || events.length === 0) {
      throw new HttpException('No active events found', HttpStatus.NOT_FOUND);
    }

    return events;
  } catch (error) {
    throw new HttpException(`Failed to retrieve active events: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
}

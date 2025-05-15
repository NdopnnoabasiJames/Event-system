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
  console.log(`Adding marketer ${marketerId} to event ${eventId}`);
  
  const [event, marketer] = await Promise.all([
    this.findOne(eventId),
    this.usersService.findById(marketerId),
  ]);

  console.log(`Retrieved event and marketer:`, {
    eventId: event._id.toString(),
    marketerId: marketer._id.toString(),
    marketerRole: marketer.role
  });

  if (marketer.role !== Role.MARKETER) {
    throw new UnauthorizedException('Only marketers can be added to events');
  }

  if (!event.marketers) {
    event.marketers = [];
    console.log('Event had no marketers array, created empty array');
  }

  const marketerId_ObjId = new Types.ObjectId(marketerId);
  console.log(`Converted marketerId to ObjectId: ${marketerId_ObjId.toString()}`);
  
  const isMarketerAlreadyAdded = event.marketers.some(m => m.toString() === marketerId_ObjId.toString());
  console.log(`Is marketer already added to event? ${isMarketerAlreadyAdded}`);
  
  if (!isMarketerAlreadyAdded) {
    console.log('Adding marketer to event...');
    event.marketers.push(marketerId_ObjId);
    
    try {
      console.log('Saving event and updating user...');
      await Promise.all([
        event.save(),
        this.usersService.addEventParticipation(marketerId, eventId),
      ]);
      console.log('Successfully saved event and updated user');
    } catch (error) {
      console.error('Error while saving event or updating user:', error);
      throw new HttpException(`Failed to add marketer to event: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  } else {
    console.log('Marketer was already added to this event');
  }

  // Double-check that the marketer was actually added
  const updatedEvent = await this.findOne(eventId);
  const marketerAdded = updatedEvent.marketers.some(m => m.toString() === marketerId_ObjId.toString());
  console.log(`Final check - Is marketer in event.marketers? ${marketerAdded}`);
  
  return updatedEvent;
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

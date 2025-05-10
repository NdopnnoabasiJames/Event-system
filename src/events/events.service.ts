import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Schema as MongooseSchema } from 'mongoose';
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
    const event = new this.eventModel(createEventDto);
    return event.save();
  }

  async findAll(): Promise<EventDocument[]> {
    return this.eventModel.find().populate('marketers', '-password').exec();
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

  async addBusPickup(eventId: string, location: string, departureTime: Date): Promise<EventDocument> {
    const event = await this.findOne(eventId);
    
    event.busPickups = event.busPickups || [];
    event.busPickups.push({ 
      location, 
      departureTime,
      maxCapacity: 50,
      currentCount: 0,
      notes: ''
    });
    
    return event.save();
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

    const marketerId_ObjId = new MongooseSchema.Types.ObjectId(marketerId);
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
    const event = await this.findOne(eventId);

    const marketerId_ObjId = new MongooseSchema.Types.ObjectId(marketerId);
    event.marketers = event.marketers.filter(
      (id) => id.toString() !== marketerId_ObjId.toString()
    );

    await Promise.all([
      event.save(),
      this.usersService.removeEventParticipation(marketerId, eventId),
    ]);

    return this.findOne(eventId);
  }

  async getEventsByState(state: string): Promise<EventDocument[]> {
    return this.eventModel
      .find({ state })
      .populate('marketers', '-password')
      .exec();
  }

  async getActiveEvents(): Promise<EventDocument[]> {
    return this.eventModel
      .find({ isActive: true })
      .populate('marketers', '-password')
      .exec();
  }
}

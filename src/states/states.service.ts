import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { State, StateDocument } from '../schemas/state.schema';
import { CreateStateDto } from './dto/create-state.dto';
import { UpdateStateDto } from './dto/update-state.dto';

@Injectable()
export class StatesService {
  constructor(
    @InjectModel(State.name) private stateModel: Model<StateDocument>,
  ) {}

  async create(createStateDto: CreateStateDto): Promise<StateDocument> {
    try {
      const existingState = await this.stateModel.findOne({ 
        name: { $regex: new RegExp(`^${createStateDto.name}$`, 'i') }
      });

      if (existingState) {
        throw new ConflictException('State with this name already exists');
      }

      const createdState = new this.stateModel(createStateDto);
      return await createdState.save();
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('State with this name already exists');
      }
      throw error;
    }
  }

  async findAll(includeInactive = false): Promise<StateDocument[]> {
    const filter = includeInactive ? {} : { isActive: true };
    return await this.stateModel
      .find(filter)
      .sort({ name: 1 })
      .exec();
  }

  async findOne(id: string): Promise<StateDocument> {
    const state = await this.stateModel.findById(id).exec();
    if (!state) {
      throw new NotFoundException('State not found');
    }
    return state;
  }

  async findByName(name: string): Promise<StateDocument | null> {
    return await this.stateModel
      .findOne({ 
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        isActive: true 
      })
      .exec();
  }

  async update(id: string, updateStateDto: UpdateStateDto): Promise<StateDocument> {
    // Check if name already exists (excluding current state)
    if (updateStateDto.name) {
      const existingState = await this.stateModel.findOne({
        name: { $regex: new RegExp(`^${updateStateDto.name}$`, 'i') },
        _id: { $ne: id }
      });

      if (existingState) {
        throw new ConflictException('State with this name already exists');
      }
    }

    const updatedState = await this.stateModel
      .findByIdAndUpdate(id, updateStateDto, { new: true })
      .exec();

    if (!updatedState) {
      throw new NotFoundException('State not found');
    }

    return updatedState;
  }

  async remove(id: string): Promise<void> {
    const result = await this.stateModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('State not found');
    }
  }

  async deactivate(id: string): Promise<StateDocument> {
    return await this.update(id, { isActive: false });
  }

  async activate(id: string): Promise<StateDocument> {
    return await this.update(id, { isActive: true });
  }
}

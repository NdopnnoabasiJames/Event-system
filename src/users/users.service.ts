import { HttpException, HttpStatus, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Schema as MongooseSchema, Types } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { Role } from '../common/enums/role.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}
 async create(createUserDto: CreateUserDto): Promise<UserDocument> {
  try {
    // Ensure required fields are present
    if (!createUserDto.name || !createUserDto.email || !createUserDto.password) {
      throw new Error('Missing required fields');
    }

    const user = new this.userModel({
      ...createUserDto,
      role: createUserDto.role || Role.USER
    });

    return await user.save();
  } catch (error) {
    if (error.code === 11000) { // MongoDB duplicate key error
      throw new Error('Email already exists');
    }
    // Log the error for debugging
    console.error('Error creating user:', error);
    throw new Error(`Failed to create user: ${error.message}`);
  }
}  async findByEmail(email: string): Promise<UserDocument> {
  try {
    console.log('Searching for user by email:', email);
    const user = await this.userModel.findOne({ email }).exec();
    console.log('User found:', user ? 'Yes' : 'No');
    
    if (!user) {
      console.log('No user found with email:', email);
    }
    
    return user;
  } catch (error) {
    console.error('Error finding user by email:', error);
    throw new HttpException(`Failed to find user by email: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
  async findById(id: string): Promise<UserDocument> {
    try {
      const user = await this.userModel.findById(id).exec();
      if (!user) {
        throw new NotFoundException('User not found');
      }
      return user;
    } catch (error) {
      throw new HttpException(`Failed to find user by ID: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  
  async findByRole(role: string): Promise<UserDocument[]> {
    try {
      const users = await this.userModel.find({ role }).exec();
      return users;
    } catch (error) {
      throw new HttpException(`Failed to find users by role: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async findAllMarketers(): Promise<UserDocument[]> {
  try {
    return await this.userModel.find({ role: Role.MARKETER }).exec();
  } catch (error) {
    throw new HttpException(`Failed to retrieve marketers: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

  async update(id: string, updateUserDto: UpdateUserDto, currentUser: any): Promise<UserDocument> {
    // Only admin can update other users, marketers can only update their own profile
    if (currentUser.role !== Role.ADMIN && currentUser.userId !== id) {
      throw new UnauthorizedException('You can only update your own profile');
    }

    const user = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async delete(id: string, currentUser: any): Promise<void> {
    // Only admin can delete users
    if (currentUser.role !== Role.ADMIN) {
      throw new UnauthorizedException('Only admins can delete users');
    }

    const user = await this.userModel.findByIdAndDelete(id).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
  }

async addEventParticipation(userId: string, eventId: string): Promise<UserDocument> {
  console.log(`Adding event ${eventId} to user ${userId} participation`);
  
  const user = await this.userModel.findById(userId).exec();
  if (!user) {
    console.error(`User ${userId} not found`);
    throw new NotFoundException('User not found');
  }

  // Initialize eventParticipation if it doesn't exist
  if (!user.eventParticipation) {
    console.log(`User ${userId} had no eventParticipation array, creating one`);
    user.eventParticipation = [];
  }

  console.log(`Before update, user eventParticipation:`, user.eventParticipation.map(e => e.toString()));
  
  const eventObjectId = new Types.ObjectId(eventId);
  console.log(`Converted eventId to ObjectId: ${eventObjectId.toString()}`);
  
  const isEventAlreadyAdded = user.eventParticipation.some(e => e.toString() === eventObjectId.toString());
  console.log(`Is event already in user's participation? ${isEventAlreadyAdded}`);
  
  if (!isEventAlreadyAdded) {
    console.log(`Adding event ${eventId} to user's participation`);
    user.eventParticipation.push(eventObjectId);
    
    try {
      await user.save();
      console.log(`Successfully saved user with new event participation`);
    } catch (error) {
      console.error(`Error saving user with new event participation:`, error);
      throw error;
    }
  } else {
    console.log(`Event ${eventId} was already in user's participation`);
  }
  
  // Double-check that the event was actually added
  const updatedUser = await this.userModel.findById(userId).exec();
  console.log(`After update, user eventParticipation:`, updatedUser.eventParticipation.map(e => e.toString()));
  
  return updatedUser;
}

  async removeEventParticipation(userId: string, eventId: string): Promise<UserDocument> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const eventObjectId = new Types.ObjectId(eventId);
    user.eventParticipation = user.eventParticipation.filter(
      (event) => event.toString() !== eventObjectId.toString()
    );
    return user.save();
  }
}

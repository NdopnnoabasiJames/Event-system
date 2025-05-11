import { HttpException, HttpStatus, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Schema as MongooseSchema } from 'mongoose';
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
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
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
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const eventObjectId = new MongooseSchema.Types.ObjectId(eventId);
    if (!user.eventParticipation.some(e => e.toString() === eventObjectId.toString())) {
      user.eventParticipation.push(eventObjectId);
      await user.save();
    }

    return user;
  }

  async removeEventParticipation(userId: string, eventId: string): Promise<UserDocument> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const eventObjectId = new MongooseSchema.Types.ObjectId(eventId);
    user.eventParticipation = user.eventParticipation.filter(
      (event) => event.toString() !== eventObjectId.toString()
    );
    return user.save();
  }
}

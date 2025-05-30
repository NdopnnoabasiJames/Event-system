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
      role: createUserDto.role
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
    const user = await this.userModel.findOne({ email }).exec();
    return user;
  } catch (error) {
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
    if (currentUser.role !== Role.SUPER_ADMIN && currentUser.userId !== id) {
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
    if (currentUser.role !== Role.SUPER_ADMIN) {
      throw new UnauthorizedException('Only super admins can delete users');
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

  // Initialize eventParticipation if it doesn't exist
  if (!user.eventParticipation) {
    user.eventParticipation = [];
  }
  
  const eventObjectId = new Types.ObjectId(eventId);  
  const isEventAlreadyAdded = user.eventParticipation.some(e => e.toString() === eventObjectId.toString());
  
  if (!isEventAlreadyAdded) {
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

    const eventObjectId = new Types.ObjectId(eventId);
    user.eventParticipation = user.eventParticipation.filter(
      (event) => event.toString() !== eventObjectId.toString()
    );
    return user.save();
  }

  // Admin approval methods
  async getPendingAdmins(approverRole: string, approverState?: string): Promise<UserDocument[]> {
    const query: any = { isApproved: false };
    
    if (approverRole === 'super_admin') {
      // Super admin can see all pending state admins
      query.role = 'state_admin';
    } else if (approverRole === 'state_admin' && approverState) {
      // State admin can see pending branch admins in their state
      query.role = 'branch_admin';
      query.state = approverState;
    }
    
    return this.userModel.find(query).exec();
  }

  async approveAdmin(adminId: string, approverId: string): Promise<UserDocument> {
    const admin = await this.userModel.findById(adminId).exec();
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    if (admin.isApproved) {
      throw new HttpException('Admin is already approved', HttpStatus.BAD_REQUEST);
    }

    admin.isApproved = true;
    admin.approvedBy = new Types.ObjectId(approverId);
    return admin.save();
  }

  async rejectAdmin(adminId: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(adminId).exec();
    if (!result) {
      throw new NotFoundException('Admin not found');
    }
  }
}

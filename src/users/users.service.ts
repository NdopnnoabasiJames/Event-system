import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Schema as MongooseSchema } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async create(createUserDto: any): Promise<UserDocument> {
    const user = new this.userModel(createUserDto);
    return user.save();
  }

  async findByEmail(email: string): Promise<UserDocument> {
    return this.userModel.findOne({ email }).exec();
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findAllMarketers(): Promise<UserDocument[]> {
    return this.userModel.find({ role: Role.MARKETER }).exec();
  }

  async update(id: string, updateUserDto: any, currentUser: any): Promise<UserDocument> {
    // Only admin can update other users, marketers can only update their own profile
    if (currentUser.role !== Role.ADMIN && currentUser.userId !== id) {
      throw new UnauthorizedException('You can only update your own profile');
    }

    // Prevent role modification through update
    if (updateUserDto.role && currentUser.role !== Role.ADMIN) {
      delete updateUserDto.role;
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

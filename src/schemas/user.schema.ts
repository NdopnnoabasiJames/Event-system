import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { Role } from '../common/enums/role.enum';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, enum: Role, default: Role.MARKETER })
  role: Role;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Event' }] })
  eventParticipation: MongooseSchema.Types.ObjectId[];
}

export const UserSchema = SchemaFactory.createForClass(User);
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { Role } from '../common/enums/role.enum';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;
  @Prop({ required: true, unique: true, index: true })
  email: string;

  @Prop({ required: false })
  phone?: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, enum: Role, default: Role.MARKETER, index: true })
  role: Role;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Event' }], index: true })
  eventParticipation: MongooseSchema.Types.ObjectId[];
}

export const UserSchema = SchemaFactory.createForClass(User);

// Add compound indexes
UserSchema.index({ email: 1, role: 1 });
UserSchema.index({ role: 1, eventParticipation: 1 });

// Add text index for search
UserSchema.index({ name: 'text', email: 'text' });
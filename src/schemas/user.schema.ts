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
  password: string;  @Prop({ required: true, enum: Role, default: Role.ATTENDEE, index: true })
  role: Role;

  // Admin hierarchy fields - ObjectId references
  @Prop({ type: Types.ObjectId, ref: 'State', required: false, index: true })
  state?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Branch', required: false, index: true })
  branch?: Types.ObjectId;

  @Prop({ default: false })
  isApproved: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  approvedBy?: Types.ObjectId;
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Event' }], default: [] })
  eventParticipation: Types.ObjectId[];
}

export const UserSchema = SchemaFactory.createForClass(User);

// Add compound indexes
UserSchema.index({ email: 1, role: 1 });
UserSchema.index({ role: 1, eventParticipation: 1 });
UserSchema.index({ role: 1, state: 1 });
UserSchema.index({ role: 1, branch: 1 });
UserSchema.index({ isApproved: 1, role: 1 });

// Add text index for search
UserSchema.index({ name: 'text', email: 'text' });
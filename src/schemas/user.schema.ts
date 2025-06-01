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

  @Prop({ type: Types.ObjectId, ref: 'Zone', required: false, index: true })
  zone?: Types.ObjectId;

  @Prop({ default: false })
  isApproved: boolean;
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  approvedBy?: Types.ObjectId;

  // Performance rating for marketers (all-time rating based on attendee check-ins)
  @Prop({ type: Number, min: 0, max: 5, default: 0 })
  performanceRating: number;

  // Total invited attendees who actually checked in (for rating calculation)
  @Prop({ type: Number, default: 0 })
  totalCheckedInAttendees: number;

  // Total attendees invited across all events
  @Prop({ type: Number, default: 0 })
  totalInvitedAttendees: number;

  // Admin status for disable/enable functionality
  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Event' }], default: [] })
  eventParticipation: Types.ObjectId[];
}

export const UserSchema = SchemaFactory.createForClass(User);

// Add compound indexes
UserSchema.index({ email: 1, role: 1 });
UserSchema.index({ role: 1, eventParticipation: 1 });
UserSchema.index({ role: 1, state: 1 });
UserSchema.index({ role: 1, branch: 1 });
UserSchema.index({ role: 1, zone: 1 });
UserSchema.index({ isApproved: 1, role: 1 });
UserSchema.index({ isActive: 1, role: 1 });
UserSchema.index({ performanceRating: -1, role: 1 }); // For performance ranking

// Add text index for search
UserSchema.index({ name: 'text', email: 'text' });
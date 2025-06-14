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
  password: string;  @Prop({ required: true, enum: Role, default: Role.GUEST, index: true })
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

  @Prop({ type: Date, required: false })
  approvedAt?: Date;
  
  // Performance rating for workers (all-time rating based on guest check-ins)
  @Prop({ type: Number, min: 0, max: 5, default: 0 })
  performanceRating: number;

  // Total invited guests who actually checked in (for rating calculation)
  @Prop({ type: Number, default: 0 })
  totalCheckedInGuests: number;

  // Total guests invited across all events
  @Prop({ type: Number, default: 0 })
  totalInvitedGuests: number;
  // Admin status for disable/enable functionality
  @Prop({ default: true })
  isActive: boolean;

  // Admin disable/enable tracking
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  disabledBy?: Types.ObjectId;

  @Prop({ type: Date, required: false })
  disabledAt?: Date;

  @Prop({ type: String, required: false })
  disableReason?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  enabledBy?: Types.ObjectId;
  @Prop({ type: Date, required: false })
  enabledAt?: Date;

  // Admin replacement tracking
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  replacedBy?: Types.ObjectId;

  @Prop({ type: Date, required: false })
  replacementDate?: Date;
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Event' }], default: [] })
  eventParticipation: Types.ObjectId[];

  // Registrar-specific fields for Phase 4.1
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Zone' }], default: [] })
  assignedZones?: Types.ObjectId[];

  // Rejection tracking for registrars
  @Prop({ type: String, required: false })
  rejectionReason?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  rejectedBy?: Types.ObjectId;
  @Prop({ type: Date, required: false })
  rejectedAt?: Date;

  // Last login tracking
  @Prop({ type: Date, required: false })
  lastLogin?: Date;

  // Profile fields for registrars
  @Prop({ type: String, required: false })
  bio?: string;

  @Prop({ type: String, required: false })
  profileImage?: string;
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
UserSchema.index({ role: 1, assignedZones: 1 }); // For registrar zone assignments

// Add text index for search
UserSchema.index({ name: 'text', email: 'text' });
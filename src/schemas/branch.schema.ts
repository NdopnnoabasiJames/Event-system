import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type BranchDocument = Branch & Document;

@Schema({ timestamps: true })
export class Branch {
  @Prop({ required: true, index: true })
  name: string;

  @Prop({ required: true })
  location: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'State', required: true, index: true })
  stateId: MongooseSchema.Types.ObjectId;
  @Prop()
  manager?: string;

  @Prop()
  phone?: string;

  @Prop()
  email?: string;

  @Prop()
  contact?: string;
  @Prop({ default: true, index: true })
  isActive: boolean;

  // Performance tracking fields
  @Prop({ type: Number, default: 0 })
  totalScore: number;

  @Prop({ type: Number, default: 0 })
  totalInvitedGuests: number;

  @Prop({ type: Number, default: 0 })
  totalCheckedInGuests: number;

  @Prop({ type: Number, default: 0 })
  workersCount: number;

  @Prop({ type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true })
  status: string;
}

export const BranchSchema = SchemaFactory.createForClass(Branch);

// Add compound index to prevent duplicate branch names within the same state
BranchSchema.index({ name: 1, stateId: 1 }, { unique: true });

// Add indexes for common queries
BranchSchema.index({ stateId: 1, isActive: 1 });
BranchSchema.index({ isActive: 1, name: 1 });

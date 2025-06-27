import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type StateDocument = State & Document;

@Schema({ timestamps: true })
export class State {
  @Prop({ required: true, unique: true, index: true })
  name: string;

  @Prop({ 
    index: true, 
    unique: true, 
    sparse: true, // Allows multiple documents with null/undefined values
    validate: {
      validator: function(v: string) {
        return !v || v.length === 3;
      },
      message: 'State code must be exactly 3 characters'
    }
  })
  code?: string;

  @Prop({ default: 'Nigeria' })
  country: string;
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
  branchesCount: number;

  @Prop({ type: Number, default: 0 })
  workersCount: number;
}

export const StateSchema = SchemaFactory.createForClass(State);

// Add indexes for common queries
StateSchema.index({ isActive: 1, name: 1 });
StateSchema.index({ country: 1, isActive: 1 });

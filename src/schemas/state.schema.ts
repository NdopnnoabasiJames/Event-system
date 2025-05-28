import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type StateDocument = State & Document;

@Schema({ timestamps: true })
export class State {
  @Prop({ required: true, unique: true, index: true })
  name: string;

  @Prop({ index: true })
  code?: string;

  @Prop({ default: 'Nigeria' })
  country: string;

  @Prop({ default: true, index: true })
  isActive: boolean;
}

export const StateSchema = SchemaFactory.createForClass(State);

// Add indexes for common queries
StateSchema.index({ isActive: 1, name: 1 });
StateSchema.index({ country: 1, isActive: 1 });

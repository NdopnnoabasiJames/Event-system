import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type EventDocument = Event & Document;

import { BusPickup, Branch } from '../common/interfaces/event.interface';

@Schema({ timestamps: true })
export class Event {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  date: string;  @Prop({ type: [String], required: true })
  states: string[];

  @Prop({ type: Object, required: true })
  branches: Record<string, string[]>;

  @Prop({ type: [{ type: Object }] })
  busPickups: BusPickup[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }] })
  
  marketers: Types.ObjectId[];
  @Prop({ default: false })
  isActive: boolean;
  
  @Prop()
  bannerImage: string;
  
  @Prop()
  description: string;

  @Prop({
    type: [
      {
        _id: { type: MongooseSchema.Types.ObjectId, auto: true },
        user: { type: Types.ObjectId, ref: 'User', required: true },
        status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
        requestedAt: { type: Date, default: Date.now },
        reviewedAt: { type: Date },
        reviewedBy: { type: Types.ObjectId, ref: 'User' },
      },
    ],
    default: [],
  })
  conciergeRequests: {
    _id?: MongooseSchema.Types.ObjectId;
    user: Types.ObjectId,
    status: string,
    requestedAt: Date,
    reviewedAt?: Date,
    reviewedBy?: Types.ObjectId,
  }[];  // <-- Changed from tuple syntax to array syntax
}


export const EventSchema = SchemaFactory.createForClass(Event);

// Add indexes
EventSchema.index({ date: 1 });
EventSchema.index({ state: 1 });
EventSchema.index({ isActive: 1 });
EventSchema.index({ 'marketers': 1 });
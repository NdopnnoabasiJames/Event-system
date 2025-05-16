import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type AttendeeDocument = Attendee & Document;

@Schema({ timestamps: true })
export class Attendee {  @Prop({ required: true, index: 'text' })
  name: string;

  @Prop({ index: true })
  email?: string;

  @Prop({ required: true, index: true })
  phone: string;

  @Prop({ required: true, enum: ['bus', 'private'], default: 'private', index: true })
  transportPreference: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Event', required: true, index: true })
  event: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  registeredBy: MongooseSchema.Types.ObjectId;
  @Prop({ 
    type: {
      location: { type: String, required: true },
      departureTime: { type: String, required: true }  // Changed from Date to string
    },
    _id: false,
    required: function() {
      return this.transportPreference === 'bus';
    }
  })
  busPickup: {
    location: string;
    departureTime: string;  // Changed from Date to string
  };
}

export const AttendeeSchema = SchemaFactory.createForClass(Attendee);

// Add compound indexes for common queries
AttendeeSchema.index({ event: 1, transportPreference: 1 });
AttendeeSchema.index({ registeredBy: 1, event: 1 });
AttendeeSchema.index({ 'busPickup.location': 1, event: 1 });

// Add unique constraint for one registration per phone number per event
AttendeeSchema.index({ phone: 1, event: 1 }, { unique: true });
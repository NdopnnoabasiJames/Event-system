import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type AttendeeDocument = Attendee & Document;

@Schema({ timestamps: true })
export class Attendee {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  email: string;

  @Prop()
  phone: string;

  @Prop({ required: true, enum: ['bus', 'private'], default: 'private' })
  transportPreference: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Event', required: true })
  event: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  registeredBy: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.Mixed })
  busPickup: {
    location: string;
    departureTime: Date;
  };
}

export const AttendeeSchema = SchemaFactory.createForClass(Attendee);
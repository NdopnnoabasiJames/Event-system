import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type GuestDocument = Guest & Document;

@Schema({ timestamps: true })
export class Guest {
  @Prop({ required: true, index: 'text' })
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

  @Prop({ default: false })
  checkedIn: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false })
  checkedInBy: MongooseSchema.Types.ObjectId;
  @Prop({ type: Date, required: false })
  checkedInTime: Date;

  @Prop({ 
    type: String, 
    enum: ['invited', 'confirmed', 'checked_in', 'no_show', 'cancelled'],
    default: 'invited',
    index: true
  })
  status: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'State', required: true, index: true })
  state: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Branch', required: true, index: true })
  branch: MongooseSchema.Types.ObjectId;
  
  @Prop({ 
    type: MongooseSchema.Types.ObjectId, 
    ref: 'PickupStation', 
    required: function() {
      return this.transportPreference === 'bus';
    },
    index: true
  })
  pickupStation?: MongooseSchema.Types.ObjectId;
  @Prop({ 
    type: String,
    required: function() {
      return this.transportPreference === 'bus';
    }
  })
  departureTime?: string;
}

export const GuestSchema = SchemaFactory.createForClass(Guest);

// Add compound indexes for common queries
GuestSchema.index({ event: 1, transportPreference: 1 });
GuestSchema.index({ registeredBy: 1, event: 1 });
GuestSchema.index({ pickupStation: 1, event: 1 });
GuestSchema.index({ state: 1, branch: 1 });
GuestSchema.index({ branch: 1, pickupStation: 1 });

// Add unique constraint for one registration per phone number per event
GuestSchema.index({ phone: 1, event: 1 }, { unique: true });

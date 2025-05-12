import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from './user.schema';

export type MarketerDocument = Marketer & Document;

@Schema({ timestamps: true })
export class Marketer {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  user: MongooseSchema.Types.ObjectId;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Event' }], default: [] })
  assignedEvents: MongooseSchema.Types.ObjectId[];

  @Prop({ default: 0 })
  totalAttendeesRegistered: number;

  @Prop({ type: Map, of: Number, default: {} })
  attendeesPerEvent: Map<string, number>;

  @Prop({ default: Date.now })
  lastActivityDate: Date;
}

export const MarketerSchema = SchemaFactory.createForClass(Marketer);

// Add indexes for common queries
MarketerSchema.index({ user: 1 }, { unique: true });
MarketerSchema.index({ assignedEvents: 1 });
MarketerSchema.index({ totalAttendeesRegistered: -1 }); // For sorting by performance
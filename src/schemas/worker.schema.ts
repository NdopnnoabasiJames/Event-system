import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from './user.schema';

export type WorkerDocument = Worker & Document;

@Schema({ timestamps: true })
export class Worker {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  user: MongooseSchema.Types.ObjectId;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Event' }], default: [] })
  assignedEvents: MongooseSchema.Types.ObjectId[];

  @Prop({ default: 0 })
  totalGuestsRegistered: number;

  @Prop({ type: Map, of: Number, default: {} })
  guestsPerEvent: Map<string, number>;

  @Prop({ default: Date.now })
  lastActivityDate: Date;
}

export const WorkerSchema = SchemaFactory.createForClass(Worker);

// Add indexes for common queries
WorkerSchema.index({ user: 1 }, { unique: true });
WorkerSchema.index({ assignedEvents: 1 });
WorkerSchema.index({ totalGuestsRegistered: -1 }); // For sorting by performance
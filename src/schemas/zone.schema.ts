import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type ZoneDocument = Zone & Document;

@Schema({ timestamps: true })
export class Zone {
  @Prop({ required: true, index: true })
  name: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Branch', required: true, index: true })
  branchId: MongooseSchema.Types.ObjectId;

  @Prop({ default: true, index: true })
  isActive: boolean;

  @Prop({ type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true })
  status: string;
}

export const ZoneSchema = SchemaFactory.createForClass(Zone);

// Add compound index to prevent duplicate zone names within the same branch
ZoneSchema.index({ name: 1, branchId: 1 }, { unique: true });

// Add indexes for common queries
ZoneSchema.index({ branchId: 1, isActive: 1 });

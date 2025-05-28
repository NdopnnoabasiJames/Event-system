import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type PickupStationDocument = PickupStation & Document;

@Schema({ timestamps: true })
export class PickupStation {
  @Prop({ required: true, index: true })
  location: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Branch', required: true, index: true })
  branchId: MongooseSchema.Types.ObjectId;

  @Prop({ default: true, index: true })
  isActive: boolean;
}

export const PickupStationSchema = SchemaFactory.createForClass(PickupStation);

// Add compound index to prevent duplicate pickup locations within the same branch
PickupStationSchema.index({ location: 1, branchId: 1 }, { unique: true });

// Add indexes for common queries
PickupStationSchema.index({ branchId: 1, isActive: 1 });
PickupStationSchema.index({ isActive: 1, location: 1 });

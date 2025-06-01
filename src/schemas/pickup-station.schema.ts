import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type PickupStationDocument = PickupStation & Document;

@Schema({ timestamps: true })
export class PickupStation {
  @Prop({ required: true, index: true })
  location: string;
  
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Branch', required: true, index: true })
  branchId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Zone', required: true, index: true })
  zoneId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'State', index: true })
  stateId: MongooseSchema.Types.ObjectId;
  
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: MongooseSchema.Types.ObjectId;

  // Default capacity for this pickup station (can be overridden in events)
  @Prop({ type: Number, default: 50, min: 1 })
  defaultCapacity: number;

  // Enhanced properties for Phase 3.3
  @Prop({ type: Number, min: 1 })
  capacity: number;

  @Prop({ type: String })
  departureTime: string;

  @Prop({ type: Number, min: 0 })
  availableCapacity: number;

  @Prop({ type: Number, default: 0, min: 0 })
  usageCount: number;

  @Prop({ type: Date })
  lastUsed: Date;

  @Prop({ type: Number, min: 0 })
  averageCapacity: number;

  @Prop({ type: Date })
  lastModified: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  lastModifiedBy: MongooseSchema.Types.ObjectId;

  @Prop({ default: true, index: true })
  isActive: boolean;
}

export const PickupStationSchema = SchemaFactory.createForClass(PickupStation);

// Add compound index to prevent duplicate pickup locations within the same branch
PickupStationSchema.index({ location: 1, branchId: 1 }, { unique: true });

// Add indexes for common queries
PickupStationSchema.index({ branchId: 1, isActive: 1 });
PickupStationSchema.index({ isActive: 1, location: 1 });
PickupStationSchema.index({ zoneId: 1, branchId: 1 });
PickupStationSchema.index({ createdBy: 1 });
PickupStationSchema.index({ stateId: 1, isActive: 1 });
PickupStationSchema.index({ usageCount: -1 });
PickupStationSchema.index({ lastUsed: -1 });
PickupStationSchema.index({ averageCapacity: -1 });

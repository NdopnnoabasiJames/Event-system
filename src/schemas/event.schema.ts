import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type EventDocument = Event & Document;

// Event-specific pickup station with departure time
export interface EventPickupStation {
  pickupStationId: Types.ObjectId;
  departureTime: string;
  maxCapacity?: number;
  currentCount?: number;
  notes?: string;
}

@Schema({ timestamps: true })
export class Event {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  date: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;  @Prop({ required: true, enum: ['super_admin', 'state_admin', 'branch_admin', 'zonal_admin'] })
  creatorLevel: string;
  // Available states and branches (selected by higher level admins)
  @Prop({ type: [{ type: Types.ObjectId, ref: 'State' }], default: [] })
  availableStates: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Branch' }], default: [] })
  availableBranches: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Zone' }], default: [] })
  availableZones: Types.ObjectId[];

  @Prop({ 
    type: [{ 
      pickupStationId: { type: Types.ObjectId, ref: 'PickupStation', required: true },
      departureTime: { type: String, required: true },
      maxCapacity: { type: Number },
      currentCount: { type: Number, default: 0 },
      notes: { type: String }
    }],
    default: []
  })
  pickupStations: EventPickupStation[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }] })
  
  marketers: Types.ObjectId[];
  @Prop({ default: false })
  isActive: boolean;
    @Prop()
  bannerImage: string;
  
  @Prop()
  description: string;

  @Prop({ 
    type: [{ 
      location: { type: String, required: true },
      departureTime: { type: String, required: true },
      maxCapacity: { type: Number, default: 50 },
      currentCount: { type: Number, default: 0 },
      notes: { type: String }
    }],
    default: []
  })
  busPickups: {
    location: string;
    departureTime: string;
    maxCapacity?: number;
    currentCount?: number;
    notes?: string;
  }[];

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
EventSchema.index({ createdBy: 1 });
EventSchema.index({ creatorLevel: 1 });
EventSchema.index({ selectedStates: 1 });
EventSchema.index({ selectedBranches: 1 });
EventSchema.index({ availableZones: 1 });
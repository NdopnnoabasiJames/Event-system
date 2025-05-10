import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type EventDocument = Event & Document;

interface BusPickup {
  location: string;
  departureTime: Date;
}

interface Branch {
  name: string;
  location: string;
}

@Schema({ timestamps: true })
export class Event {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  state: string;

  @Prop({ type: [{ type: Object }], required: true })
  branches: Branch[];

  @Prop({ type: [{ type: Object }] })
  busPickups: BusPickup[];

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }] })
  marketers: MongooseSchema.Types.ObjectId[];

  @Prop({ default: false })
  isActive: boolean;
}

export const EventSchema = SchemaFactory.createForClass(Event);
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type EventDocument = Event & Document;

import { BusPickup, Branch } from '../common/interfaces/event.interface';

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
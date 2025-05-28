import { EventStatus } from '../enums/event-status.enum';
import { Document, Types } from 'mongoose';

export interface EventPickupStation {
  pickupStationId: Types.ObjectId;
  departureTime: string;
  maxCapacity: number;
  currentCount: number;
  notes?: string;
}

export interface EventLocation {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface IEvent extends Document {
  name: string;
  description?: string;
  date: string; // changed from Date to string for DTO compatibility
  status: EventStatus;
  states: Types.ObjectId[];
  branches: Types.ObjectId[];
  pickupStations?: EventPickupStation[];
  currentAttendees: number;
  marketers: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

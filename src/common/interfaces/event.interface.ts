import { EventStatus } from '../enums/event-status.enum';
import { Document } from 'mongoose';

export interface BusPickup {
  location: string;
  departureTime: Date;
  maxCapacity: number;
  currentCount: number;
  notes?: string;
}

export interface Branch {
  name: string;
  location: string;
  manager?: string;
  contact?: string;
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
  date: Date;
  status: EventStatus;
  state: string;
  maxAttendees: number;
  currentAttendees: number;
  branches: Branch[];
  busPickups?: BusPickup[];
  marketers: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

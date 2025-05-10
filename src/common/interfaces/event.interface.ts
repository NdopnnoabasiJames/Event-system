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
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  status: EventStatus;
  location: EventLocation;
  maxAttendees: number;
  currentAttendees: number;
  branch: Branch;
  busPickups?: BusPickup[];
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

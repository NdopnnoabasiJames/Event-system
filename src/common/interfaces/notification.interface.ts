import { NotificationStatus } from '../enums/notification-status.enum';
import { Document } from 'mongoose';

export interface EmailTemplate {
  subject: string;
  text: string;
  html: string;
  templateId?: string;
  variables?: Record<string, any>;
}

export interface NotificationRecipient {
  id: string;
  email: string;
  name: string;
  notificationPreferences?: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
}

export interface INotification extends Document {
  type: 'email' | 'push' | 'sms';
  recipient: NotificationRecipient;
  template: EmailTemplate;
  status: NotificationStatus;
  sentAt?: Date;
  readAt?: Date;
  failureReason?: string;
  retryCount: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventReminderContext {
  attendeeName: string;
  eventName: string;
  eventDate: Date;
  eventLocation: string;
  transportDetails?: {
    type: 'bus' | 'private';
    location?: string;
    departureTime?: Date;
    pickupPoint?: string;
    busNumber?: string;
    driverContact?: string;
  };
  eventDetails?: {
    description: string;
    duration: string;
    dress_code?: string;
    special_instructions?: string;
  };
}

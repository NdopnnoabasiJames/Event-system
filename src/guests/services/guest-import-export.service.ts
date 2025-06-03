import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Guest, GuestDocument } from '../../schemas/guest.schema';
import { User, UserDocument } from '../../schemas/user.schema';
import { Event, EventDocument } from '../../schemas/event.schema';
import { GuestValidationService } from './guest-validation.service';

export interface GuestImportData {
  name: string;
  phone: string;
  email?: string;
  transportPreference: 'bus' | 'private';
  pickupStation?: string;
  status?: string;
}

export interface GuestImportResult {
  total: number;
  successful: number;
  failed: number;
  errors: string[];
  duplicates: string[];
  imported: string[];
}

export interface GuestExportOptions {
  format: 'csv' | 'excel' | 'json';
  includeFields: string[];
  filters?: any;
}

@Injectable()
export class GuestImportExportService {
  constructor(
    @InjectModel(Guest.name) private guestModel: Model<GuestDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    private guestValidationService: GuestValidationService,
  ) {}

  /**
   * Import guests from array data
   */
  async importGuests(
    eventId: string,
    workerId: string,
    guestsData: GuestImportData[]
  ): Promise<GuestImportResult> {
    const result: GuestImportResult = {
      total: guestsData.length,
      successful: 0,
      failed: 0,
      errors: [],
      duplicates: [],
      imported: []
    };

    // Validate event and worker
    const [event, worker] = await Promise.all([
      this.eventModel.findById(eventId),
      this.userModel.findById(workerId)
    ]);

    if (!event) {
      throw new BadRequestException('Event not found');
    }

    if (!worker) {
      throw new BadRequestException('Worker not found');
    }

    // Process each guest
    for (let i = 0; i < guestsData.length; i++) {
      const guestData = guestsData[i];
      const rowNumber = i + 1;

      try {
        // Check for duplicates within the import data
        const duplicateInData = guestsData.slice(0, i).find(g => g.phone === guestData.phone);
        if (duplicateInData) {
          result.duplicates.push(`Row ${rowNumber}: Duplicate phone number ${guestData.phone} in import data`);
          result.failed++;
          continue;
        }

        // Check for existing guest with same phone in event
        const existingGuest = await this.guestModel.findOne({
          phone: guestData.phone,
          event: eventId
        });

        if (existingGuest) {
          result.duplicates.push(`Row ${rowNumber}: Guest with phone ${guestData.phone} already exists`);
          result.failed++;
          continue;
        }

        // Validate guest data
        await this.guestValidationService.validateGuestData(guestData, eventId);

        // Create guest
        const newGuest = new this.guestModel({
          name: guestData.name.trim(),
          phone: guestData.phone.trim(),
          email: guestData.email?.trim(),
          transportPreference: guestData.transportPreference,
          pickupStation: guestData.pickupStation,
          status: guestData.status || 'invited',
          event: eventId,
          registeredBy: workerId,
          state: worker.state,
          branch: worker.branch
        });

        await newGuest.save();
        result.imported.push(`Row ${rowNumber}: ${guestData.name} imported successfully`);
        result.successful++;

      } catch (error) {
        result.errors.push(`Row ${rowNumber}: ${error.message}`);
        result.failed++;
      }
    }

    return result;
  }

  /**
   * Export guests to various formats
   */
  async exportGuests(
    query: any,
    options: GuestExportOptions
  ): Promise<any> {
    const guests = await this.guestModel
      .find(query)
      .populate('event', 'name date location')
      .populate('registeredBy', 'name email')
      .populate('checkedInBy', 'name email')
      .populate('pickupStation', 'location capacity')
      .populate('state', 'name')
      .populate('branch', 'name location')
      .sort({ createdAt: -1 })
      .exec();

    const data = guests.map(guest => this.formatGuestForExport(guest, options.includeFields));

    switch (options.format) {
      case 'json':
        return { data, format: 'json' };
      case 'csv':
        return { data: this.convertToCSV(data), format: 'csv' };
      case 'excel':
        return { data: this.prepareForExcel(data), format: 'excel' };
      default:
        return { data, format: 'json' };
    }
  }

  /**
   * Generate guest import template
   */
  getImportTemplate(): any[] {
    return [
      {
        name: 'John Doe',
        phone: '08012345678',
        email: 'john@example.com',
        transportPreference: 'bus',
        pickupStation: 'pickup_station_id_here',
        status: 'invited'
      },
      {
        name: 'Jane Smith',
        phone: '08087654321',
        email: 'jane@example.com',
        transportPreference: 'private',
        pickupStation: '',
        status: 'confirmed'
      }
    ];
  }

  /**
   * Validate import data format
   */
  validateImportData(data: any[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const requiredFields = ['name', 'phone', 'transportPreference'];

    if (!Array.isArray(data)) {
      return { isValid: false, errors: ['Data must be an array'] };
    }

    if (data.length === 0) {
      return { isValid: false, errors: ['Data array cannot be empty'] };
    }

    data.forEach((item, index) => {
      const rowNumber = index + 1;

      // Check required fields
      requiredFields.forEach(field => {
        if (!item[field] || item[field].toString().trim() === '') {
          errors.push(`Row ${rowNumber}: Missing required field '${field}'`);
        }
      });

      // Validate transport preference
      if (item.transportPreference && !['bus', 'private'].includes(item.transportPreference)) {
        errors.push(`Row ${rowNumber}: Invalid transport preference. Must be 'bus' or 'private'`);
      }

      // Validate phone format
      if (item.phone && !this.isValidPhone(item.phone)) {
        errors.push(`Row ${rowNumber}: Invalid phone number format`);
      }

      // Validate email if provided
      if (item.email && !this.isValidEmail(item.email)) {
        errors.push(`Row ${rowNumber}: Invalid email format`);
      }

      // Validate status if provided
      if (item.status && !['invited', 'confirmed', 'checked_in', 'no_show', 'cancelled'].includes(item.status)) {
        errors.push(`Row ${rowNumber}: Invalid status. Must be one of: invited, confirmed, checked_in, no_show, cancelled`);
      }
    });

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Format guest data for export
   */
  private formatGuestForExport(guest: GuestDocument, includeFields: string[]): any {
    const allFields = {
      id: guest._id.toString(),
      name: guest.name,
      email: guest.email || '',
      phone: guest.phone,
      transportPreference: guest.transportPreference,
      status: guest.status,
      checkedIn: guest.checkedIn,
      checkedInTime: guest.checkedInTime || '',
      eventName: (guest.event as any)?.name || '',
      eventDate: (guest.event as any)?.date || '',
      eventLocation: (guest.event as any)?.location || '',
      registeredBy: (guest.registeredBy as any)?.name || '',
      registeredByEmail: (guest.registeredBy as any)?.email || '',
      checkedInBy: (guest.checkedInBy as any)?.name || '',
      pickupStation: (guest.pickupStation as any)?.location || '',
      state: (guest.state as any)?.name || '',
      branch: (guest.branch as any)?.name || '',
      branchLocation: (guest.branch as any)?.location || '',      registeredAt: (guest as any).createdAt,
      updatedAt: (guest as any).updatedAt
    };

    // Filter fields if specified
    if (includeFields.length > 0) {
      const filtered: any = {};
      includeFields.forEach(field => {
        if (allFields.hasOwnProperty(field)) {
          filtered[field] = allFields[field];
        }
      });
      return filtered;
    }

    return allFields;
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    
    const csvRows = data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape quotes and wrap in quotes if contains comma
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    );

    return [csvHeaders, ...csvRows].join('\n');
  }

  /**
   * Prepare data for Excel export
   */
  private prepareForExcel(data: any[]): any {
    return {
      worksheetName: 'Guests',
      data,
      headers: data.length > 0 ? Object.keys(data[0]) : []
    };
  }

  /**
   * Validate phone number format
   */
  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^(\+?234|0)?[789]\d{9}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

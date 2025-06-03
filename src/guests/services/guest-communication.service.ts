import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Guest, GuestDocument } from '../../schemas/guest.schema';
import { User, UserDocument } from '../../schemas/user.schema';
import { AdminHierarchyService } from '../../admin-hierarchy/admin-hierarchy.service';

export interface CommunicationPreferences {
  guestId: string;
  smsEnabled: boolean;
  emailEnabled: boolean;
  notificationEnabled: boolean;
  preferredLanguage: string;
}

export interface BulkContactOperation {
  guestIds: string[];
  operation: 'sms' | 'email' | 'both';
  message: string;
  scheduledFor?: Date;
}

export interface ContactValidation {
  total: number;
  validEmails: number;
  validPhones: number;
  invalidContacts: string[];
}

@Injectable()
export class GuestCommunicationService {
  constructor(
    @InjectModel(Guest.name) private guestModel: Model<GuestDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private adminHierarchyService: AdminHierarchyService,
  ) {}

  /**
   * Prepare bulk contact operation
   */
  async prepareBulkContact(
    adminId: string,
    operation: BulkContactOperation
  ): Promise<{ validation: ContactValidation; estimatedCost: number }> {
    // Validate admin can access these guests
    const admin = await this.adminHierarchyService.getAdminWithHierarchy(adminId);
    const jurisdictionQuery = await this.buildJurisdictionQuery(admin);
    
    const guests = await this.guestModel
      .find({ 
        _id: { $in: operation.guestIds },
        ...jurisdictionQuery 
      })
      .select('name email phone');

    // Validate contacts
    const validation = this.validateContacts(guests, operation.operation);
    
    // Estimate cost (simplified)
    const smsCount = operation.operation === 'sms' || operation.operation === 'both' 
      ? validation.validPhones : 0;
    const emailCount = operation.operation === 'email' || operation.operation === 'both' 
      ? validation.validEmails : 0;
    
    const estimatedCost = (smsCount * 0.05) + (emailCount * 0.01); // Example pricing

    return { validation, estimatedCost };
  }

  /**
   * Get guests suitable for communication
   */
  async getGuestsForCommunication(
    adminId: string,
    filters: {
      eventId?: string;
      transportPreference?: 'bus' | 'private';
      status?: string;
      hasValidContact?: boolean;
    }
  ): Promise<GuestDocument[]> {
    const admin = await this.adminHierarchyService.getAdminWithHierarchy(adminId);
    const query = await this.buildJurisdictionQuery(admin);
    
    // Apply filters
    if (filters.eventId) query.event = filters.eventId;
    if (filters.transportPreference) query.transportPreference = filters.transportPreference;
    if (filters.status) query.status = filters.status;
    
    let guests = await this.guestModel
      .find(query)
      .populate('event', 'name date')
      .populate('registeredBy', 'name');

    // Filter by contact validity if requested
    if (filters.hasValidContact) {
      guests = guests.filter(guest => 
        this.isValidEmail(guest.email) || this.isValidPhone(guest.phone)
      );
    }

    return guests;
  }

  /**
   * Update guest communication preferences
   */
  async updateCommunicationPreferences(
    guestId: string,
    preferences: Partial<CommunicationPreferences>
  ): Promise<void> {
    // For now, we'll store preferences in a simple way
    // In a full implementation, this would be a separate collection
    await this.guestModel.findByIdAndUpdate(guestId, {
      $set: {
        'communicationPreferences': preferences
      }
    });
  }

  /**
   * Get guest communication preferences
   */
  async getCommunicationPreferences(guestId: string): Promise<CommunicationPreferences> {
    const guest = await this.guestModel.findById(guestId);
    
    // Default preferences if none exist
    const defaultPrefs: CommunicationPreferences = {
      guestId,
      smsEnabled: true,
      emailEnabled: true,
      notificationEnabled: true,
      preferredLanguage: 'en'
    };

    return (guest as any)?.communicationPreferences || defaultPrefs;
  }

  /**
   * Get communication statistics
   */
  async getCommunicationStats(adminId: string, eventId?: string): Promise<any> {
    const admin = await this.adminHierarchyService.getAdminWithHierarchy(adminId);
    const query = await this.buildJurisdictionQuery(admin);
    
    if (eventId) query.event = eventId;
    
    const guests = await this.guestModel.find(query);
    
    const validEmails = guests.filter(g => this.isValidEmail(g.email)).length;
    const validPhones = guests.filter(g => this.isValidPhone(g.phone)).length;
    const bothContacts = guests.filter(g => 
      this.isValidEmail(g.email) && this.isValidPhone(g.phone)
    ).length;

    return {
      totalGuests: guests.length,
      validEmails,
      validPhones,
      bothContacts,
      emailCoverage: guests.length > 0 ? Math.round((validEmails / guests.length) * 100) : 0,
      phoneCoverage: guests.length > 0 ? Math.round((validPhones / guests.length) * 100) : 0,
      transportBreakdown: {
        bus: guests.filter(g => g.transportPreference === 'bus').length,
        private: guests.filter(g => g.transportPreference === 'private').length,
      }
    };
  }

  /**
   * Simple notification scheduling (foundation for Phase 5)
   */
  async scheduleEventNotifications(
    adminId: string,
    eventId: string,
    notificationType: 'invitation' | 'reminder' | 'confirmation'
  ): Promise<{ scheduled: number; message: string }> {
    const admin = await this.adminHierarchyService.getAdminWithHierarchy(adminId);
    const query = await this.buildJurisdictionQuery(admin);
    query.event = eventId;
    
    const guests = await this.guestModel.find(query);
    
    // For now, just return a summary
    // In Phase 5, this would actually schedule notifications
    return {
      scheduled: guests.length,
      message: `${notificationType} notifications prepared for ${guests.length} guests. Will be activated in Phase 5.`
    };
  }

  private validateContacts(guests: GuestDocument[], operation: string): ContactValidation {
    const invalidContacts: string[] = [];
    let validEmails = 0;
    let validPhones = 0;

    guests.forEach(guest => {
      const emailValid = this.isValidEmail(guest.email);
      const phoneValid = this.isValidPhone(guest.phone);
      
      if (emailValid) validEmails++;
      if (phoneValid) validPhones++;
      
      if (operation === 'email' && !emailValid) {
        invalidContacts.push(`${guest.name}: Invalid email`);
      } else if (operation === 'sms' && !phoneValid) {
        invalidContacts.push(`${guest.name}: Invalid phone`);
      } else if (operation === 'both' && !emailValid && !phoneValid) {
        invalidContacts.push(`${guest.name}: No valid contacts`);
      }
    });

    return {
      total: guests.length,
      validEmails,
      validPhones,
      invalidContacts
    };
  }

  private isValidEmail(email?: string): boolean {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhone(phone?: string): boolean {
    if (!phone) return false;
    // Simple phone validation - at least 10 digits
    const phoneRegex = /^\+?[\d\s-()]{10,}$/;
    return phoneRegex.test(phone);
  }

  private async buildJurisdictionQuery(admin: any): Promise<any> {
    const query: any = {};
    
    switch (admin.role) {
      case 'super_admin':
        break;
      case 'state_admin':
        query.state = admin.state;
        break;
      case 'branch_admin':
        query.branch = admin.branch;
        break;
      case 'zonal_admin':
        const branches = await this.adminHierarchyService.getAccessibleBranches(admin._id.toString());
        query.branch = { $in: branches.map(b => b._id) };
        break;
    }
    
    return query;
  }
}

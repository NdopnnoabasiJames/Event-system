import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Guest, GuestDocument } from '../../schemas/guest.schema';
import { Event, EventDocument } from '../../schemas/event.schema';
import { User, UserDocument } from '../../schemas/user.schema';
import { AdminHierarchyService } from '../../admin-hierarchy/admin-hierarchy.service';

export interface BasicAnalytics {
  totalGuests: number;
  checkedInGuests: number;
  checkInRate: number;
  statusBreakdown: { [key: string]: number };
  transportBreakdown: { bus: number; private: number };
}

export interface RegistrationTrends {
  period: string;
  registrations: number;
  date: Date;
}

@Injectable()
export class GuestAnalyticsService {
  constructor(
    @InjectModel(Guest.name) private guestModel: Model<GuestDocument>,
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private adminHierarchyService: AdminHierarchyService,
  ) {}

  /**
   * Get basic guest analytics for admin's jurisdiction
   */
  async getBasicAnalytics(adminId: string, eventId?: string): Promise<BasicAnalytics> {
    const admin = await this.adminHierarchyService.getAdminWithHierarchy(adminId);
    const query = await this.buildJurisdictionQuery(admin);
    
    if (eventId) {
      query.event = eventId;
    }

    const guests = await this.guestModel.find(query);
    
    const totalGuests = guests.length;
    const checkedInGuests = guests.filter(g => g.checkedIn).length;
    const checkInRate = totalGuests > 0 ? Math.round((checkedInGuests / totalGuests) * 100) : 0;

    // Status breakdown
    const statusBreakdown: { [key: string]: number } = {};
    guests.forEach(guest => {
      statusBreakdown[guest.status] = (statusBreakdown[guest.status] || 0) + 1;
    });

    // Transport breakdown
    const transportBreakdown = {
      bus: guests.filter(g => g.transportPreference === 'bus').length,
      private: guests.filter(g => g.transportPreference === 'private').length,
    };

    return {
      totalGuests,
      checkedInGuests,
      checkInRate,
      statusBreakdown,
      transportBreakdown,
    };
  }

  /**
   * Get registration trends over time
   */
  async getRegistrationTrends(
    adminId: string, 
    days: number = 30
  ): Promise<RegistrationTrends[]> {
    const admin = await this.adminHierarchyService.getAdminWithHierarchy(adminId);
    const query = await this.buildJurisdictionQuery(admin);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const guests = await this.guestModel
      .find({ 
        ...query,
        createdAt: { $gte: startDate }
      })
      .sort({ createdAt: 1 });

    // Group by date
    const trends: { [key: string]: { count: number; date: Date } } = {};
    
    guests.forEach(guest => {
      const date = new Date((guest as any).createdAt);
      const dateKey = date.toISOString().split('T')[0];
      
      if (!trends[dateKey]) {
        trends[dateKey] = { count: 0, date };
      }
      trends[dateKey].count++;
    });

    return Object.entries(trends)
      .map(([period, data]) => ({ 
        period, 
        registrations: data.count, 
        date: data.date 
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Get worker performance summary
   */
  async getWorkerPerformance(adminId: string, eventId?: string): Promise<any[]> {
    const admin = await this.adminHierarchyService.getAdminWithHierarchy(adminId);
    const query = await this.buildJurisdictionQuery(admin);
    
    if (eventId) {
      query.event = eventId;
    }

    const results = await this.guestModel.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$registeredBy',
          totalRegistrations: { $sum: 1 },
          checkedInCount: { 
            $sum: { $cond: [{ $eq: ['$checkedIn', true] }, 1, 0] }
          },
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'worker'
        }
      },
      { $unwind: '$worker' },
      {
        $project: {
          workerName: '$worker.name',
          totalRegistrations: 1,
          checkedInCount: 1,
          checkInRate: {
            $round: [
              { $multiply: [{ $divide: ['$checkedInCount', '$totalRegistrations'] }, 100] }, 
              2
            ]
          }
        }
      },
      { $sort: { totalRegistrations: -1 } }
    ]);

    return results;
  }

  /**
   * Get event summary analytics
   */
  async getEventSummary(adminId: string): Promise<any[]> {
    const admin = await this.adminHierarchyService.getAdminWithHierarchy(adminId);
    const query = await this.buildJurisdictionQuery(admin);

    const results = await this.guestModel.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$event',
          totalGuests: { $sum: 1 },
          checkedIn: { 
            $sum: { $cond: [{ $eq: ['$checkedIn', true] }, 1, 0] }
          },
          busUsers: {
            $sum: { $cond: [{ $eq: ['$transportPreference', 'bus'] }, 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: 'events',
          localField: '_id',
          foreignField: '_id',
          as: 'event'
        }
      },
      { $unwind: '$event' },
      {
        $project: {
          eventName: '$event.name',
          eventDate: '$event.date',
          totalGuests: 1,
          checkedIn: 1,
          checkInRate: {
            $round: [
              { $multiply: [{ $divide: ['$checkedIn', '$totalGuests'] }, 100] }, 
              2
            ]
          },
          busUsers: 1,
          busPercentage: {
            $round: [
              { $multiply: [{ $divide: ['$busUsers', '$totalGuests'] }, 100] }, 
              2
            ]
          }
        }
      },
      { $sort: { totalGuests: -1 } }
    ]);

    return results;
  }

  private async buildJurisdictionQuery(admin: any): Promise<any> {
    const query: any = {};
    
    switch (admin.role) {
      case 'super_admin':
        // No restrictions
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

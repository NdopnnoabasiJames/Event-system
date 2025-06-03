import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Guest, GuestDocument } from '../../schemas/guest.schema';

export interface GuestSearchFilters {
  search?: string;
  eventIds?: string[];
  workerIds?: string[];
  stateIds?: string[];
  branchIds?: string[];
  transportPreference?: 'bus' | 'private';
  checkedIn?: boolean;
  status?: string;
  pickupStationIds?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}

export interface GuestSearchResult {
  guests: GuestDocument[];
  total: number;
  aggregations: {
    byEvent: Record<string, number>;
    byWorker: Record<string, number>;
    byStatus: Record<string, number>;
    byTransport: Record<string, number>;
    byState: Record<string, number>;
    byBranch: Record<string, number>;
  };
}

@Injectable()
export class GuestSearchService {
  constructor(
    @InjectModel(Guest.name) private guestModel: Model<GuestDocument>,
  ) {}

  /**
   * Advanced guest search with aggregations
   */
  async searchGuests(
    filters: GuestSearchFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<GuestSearchResult> {
    const query = this.buildSearchQuery(filters);
    
    // Execute search with pagination
    const skip = (page - 1) * limit;
    const [guests, total, aggregations] = await Promise.all([
      this.guestModel
        .find(query)
        .populate('event', 'name date location')
        .populate('registeredBy', 'name email')
        .populate('state', 'name')
        .populate('branch', 'name location')
        .populate('pickupStation', 'location')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.guestModel.countDocuments(query),
      this.getSearchAggregations(query)
    ]);

    return {
      guests,
      total,
      aggregations
    };
  }

  /**
   * Quick guest search by name or phone
   */
  async quickSearch(
    searchTerm: string,
    limit: number = 10
  ): Promise<GuestDocument[]> {
    const searchRegex = new RegExp(searchTerm, 'i');
    
    return await this.guestModel
      .find({
        $or: [
          { name: searchRegex },
          { phone: searchRegex },
          { email: searchRegex }
        ]
      })
      .populate('event', 'name date')
      .populate('registeredBy', 'name')
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Search guests by multiple criteria with OR logic
   */
  async flexibleSearch(criteria: {
    names?: string[];
    phones?: string[];
    emails?: string[];
    eventIds?: string[];
  }): Promise<GuestDocument[]> {
    const orConditions: any[] = [];

    if (criteria.names?.length) {
      orConditions.push({
        name: { $in: criteria.names.map(name => new RegExp(name, 'i')) }
      });
    }

    if (criteria.phones?.length) {
      orConditions.push({
        phone: { $in: criteria.phones }
      });
    }

    if (criteria.emails?.length) {
      orConditions.push({
        email: { $in: criteria.emails.map(email => new RegExp(email, 'i')) }
      });
    }

    if (criteria.eventIds?.length) {
      orConditions.push({
        event: { $in: criteria.eventIds }
      });
    }

    if (orConditions.length === 0) {
      return [];
    }

    return await this.guestModel
      .find({ $or: orConditions })
      .populate('event', 'name date')
      .populate('registeredBy', 'name')
      .populate('state', 'name')
      .populate('branch', 'name')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Get guest duplicates (same phone, different events)
   */
  async findDuplicateGuests(): Promise<{
    phone: string;
    guests: GuestDocument[];
    count: number;
  }[]> {
    const duplicates = await this.guestModel.aggregate([
      {
        $group: {
          _id: '$phone',
          count: { $sum: 1 },
          guests: { $push: '$$ROOT' }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const result = [];
    for (const duplicate of duplicates) {
      const populatedGuests = await this.guestModel
        .find({ phone: duplicate._id })
        .populate('event', 'name date')
        .populate('registeredBy', 'name')
        .exec();

      result.push({
        phone: duplicate._id,
        guests: populatedGuests,
        count: duplicate.count
      });
    }

    return result;
  }

  /**
   * Build search query from filters
   */
  private buildSearchQuery(filters: GuestSearchFilters): any {
    const query: any = {};

    // Text search
    if (filters.search) {
      const searchRegex = new RegExp(filters.search, 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex }
      ];
    }

    // Array filters
    if (filters.eventIds?.length) {
      query.event = { $in: filters.eventIds };
    }

    if (filters.workerIds?.length) {
      query.registeredBy = { $in: filters.workerIds };
    }

    if (filters.stateIds?.length) {
      query.state = { $in: filters.stateIds };
    }

    if (filters.branchIds?.length) {
      query.branch = { $in: filters.branchIds };
    }

    if (filters.pickupStationIds?.length) {
      query.pickupStation = { $in: filters.pickupStationIds };
    }

    // Simple filters
    if (filters.transportPreference) {
      query.transportPreference = filters.transportPreference;
    }

    if (filters.checkedIn !== undefined) {
      query.checkedIn = filters.checkedIn;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    // Date range
    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) {
        query.createdAt.$gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        query.createdAt.$lte = filters.dateTo;
      }
    }

    return query;
  }

  /**
   * Get search aggregations
   */
  private async getSearchAggregations(query: any): Promise<{
    byEvent: Record<string, number>;
    byWorker: Record<string, number>;
    byStatus: Record<string, number>;
    byTransport: Record<string, number>;
    byState: Record<string, number>;
    byBranch: Record<string, number>;
  }> {
    const aggregations = await this.guestModel.aggregate([
      { $match: query },
      {
        $facet: {
          byEvent: [
            { $group: { _id: '$event', count: { $sum: 1 } } }
          ],
          byWorker: [
            { $group: { _id: '$registeredBy', count: { $sum: 1 } } }
          ],
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ],
          byTransport: [
            { $group: { _id: '$transportPreference', count: { $sum: 1 } } }
          ],
          byState: [
            { $group: { _id: '$state', count: { $sum: 1 } } }
          ],
          byBranch: [
            { $group: { _id: '$branch', count: { $sum: 1 } } }
          ]
        }
      }
    ]);

    const result = aggregations[0];
    
    return {
      byEvent: this.formatAggregation(result.byEvent),
      byWorker: this.formatAggregation(result.byWorker),
      byStatus: this.formatAggregation(result.byStatus),
      byTransport: this.formatAggregation(result.byTransport),
      byState: this.formatAggregation(result.byState),
      byBranch: this.formatAggregation(result.byBranch)
    };
  }

  /**
   * Format aggregation results
   */
  private formatAggregation(aggregation: any[]): Record<string, number> {
    const result: Record<string, number> = {};
    aggregation.forEach(item => {
      result[item._id?.toString() || 'unknown'] = item.count;
    });
    return result;
  }
}

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Event, EventDocument } from '../schemas/event.schema';
import { PickupStation, PickupStationDocument } from '../schemas/pickup-station.schema';

export interface PickupStationStats {
  totalStations: number;
  activeStations: number;
  assignedStations: number;
  unassignedStations: number;
  stationDetails: {
    id: string;
    location: string;
    isActive: boolean;
    isAssigned: boolean;
    assignedEvents: number;
  }[];
}

export interface EventPickupStationSummary {
  eventId: string;
  eventName: string;
  eventDate: string;
  totalPickupStations: number;
  totalCapacity: number;
  currentCount: number;
  pickupStations: {
    id: string;
    location: string;
    departureTime: string;
    maxCapacity: number;
    currentCount: number;
    notes?: string;
  }[];
}

@Injectable()
export class PickupStationAssignmentService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    @InjectModel(PickupStation.name) private pickupStationModel: Model<PickupStationDocument>,
  ) {}

  /**
   * Get pickup station statistics for a specific zone
   */
  async getZonePickupStationStats(zoneId: string): Promise<PickupStationStats> {
    if (!Types.ObjectId.isValid(zoneId)) {
      throw new BadRequestException('Invalid zone ID');
    }

    // Get all pickup stations in the zone
    const allStations = await this.pickupStationModel
      .find({ zoneId })
      .sort({ location: 1 })
      .exec();

    if (!allStations.length) {
      return {
        totalStations: 0,
        activeStations: 0,
        assignedStations: 0,
        unassignedStations: 0,
        stationDetails: []
      };
    }

    const activeStations = allStations.filter(station => station.isActive);

    // Get events that have pickup stations from this zone
    const eventsWithStations = await this.eventModel
      .find({ 
        'pickupStations.pickupStationId': { $in: allStations.map(s => s._id) },
        isActive: true
      })
      .exec();

    // Count assignments for each station
    const stationAssignments = new Map<string, number>();
    eventsWithStations.forEach(event => {
      event.pickupStations.forEach(ps => {
        const stationId = ps.pickupStationId.toString();
        stationAssignments.set(stationId, (stationAssignments.get(stationId) || 0) + 1);
      });
    });

    const stationDetails = allStations.map(station => ({
      id: station._id.toString(),
      location: station.location,
      isActive: station.isActive,
      isAssigned: stationAssignments.has(station._id.toString()),
      assignedEvents: stationAssignments.get(station._id.toString()) || 0
    }));

    const assignedStations = stationDetails.filter(s => s.isAssigned).length;

    return {
      totalStations: allStations.length,
      activeStations: activeStations.length,
      assignedStations,
      unassignedStations: activeStations.length - assignedStations,
      stationDetails
    };
  }

  /**
   * Get summary of pickup station assignments for all events in a zone
   */
  async getZoneEventPickupSummary(zoneId: string): Promise<EventPickupStationSummary[]> {
    if (!Types.ObjectId.isValid(zoneId)) {
      throw new BadRequestException('Invalid zone ID');
    }

    // Get all pickup stations in the zone
    const zoneStations = await this.pickupStationModel
      .find({ zoneId })
      .exec();

    if (!zoneStations.length) {
      return [];
    }

    const stationIds = zoneStations.map(s => s._id);

    // Get events that have pickup stations from this zone
    const events = await this.eventModel
      .find({ 
        'pickupStations.pickupStationId': { $in: stationIds },
        isActive: true
      })
      .populate('pickupStations.pickupStationId', 'location zoneId')
      .sort({ date: 1 })
      .exec();

    return events.map(event => {
      // Filter pickup stations to only include those from this zone
      const zonePickupStations = event.pickupStations.filter(ps => {
        const station = ps.pickupStationId as any;
        return station && station.zoneId && station.zoneId.toString() === zoneId;
      });

      const totalCapacity = zonePickupStations.reduce((sum, ps) => sum + (ps.maxCapacity || 0), 0);
      const currentCount = zonePickupStations.reduce((sum, ps) => sum + (ps.currentCount || 0), 0);

      return {
        eventId: event._id.toString(),
        eventName: event.name,
        eventDate: event.date,
        totalPickupStations: zonePickupStations.length,
        totalCapacity,
        currentCount,
        pickupStations: zonePickupStations.map(ps => {
          const station = ps.pickupStationId as any;
          return {
            id: ps.pickupStationId.toString(),
            location: station ? station.location : 'Unknown Location',
            departureTime: ps.departureTime,
            maxCapacity: ps.maxCapacity || 0,
            currentCount: ps.currentCount || 0,
            notes: ps.notes
          };
        })
      };
    });
  }

  /**
   * Validate pickup station assignments for an event
   */
  async validatePickupStationAssignments(
    eventId: string, 
    pickupStationIds: string[], 
    zoneId: string
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!Types.ObjectId.isValid(eventId)) {
      errors.push('Invalid event ID');
    }

    if (!Types.ObjectId.isValid(zoneId)) {
      errors.push('Invalid zone ID');
    }

    if (!pickupStationIds.length) {
      errors.push('At least one pickup station must be selected');
    }

    // Validate pickup station IDs
    const invalidIds = pickupStationIds.filter(id => !Types.ObjectId.isValid(id));
    if (invalidIds.length) {
      errors.push(`Invalid pickup station IDs: ${invalidIds.join(', ')}`);
    }

    if (errors.length) {
      return { valid: false, errors };
    }

    // Check if event exists
    const event = await this.eventModel.findById(eventId);
    if (!event) {
      errors.push('Event not found');
      return { valid: false, errors };
    }

    // Check if pickup stations exist and belong to the zone
    const stations = await this.pickupStationModel.find({
      _id: { $in: pickupStationIds },
      zoneId,
      isActive: true
    });

    if (stations.length !== pickupStationIds.length) {
      const foundIds = stations.map(s => s._id.toString());
      const missingIds = pickupStationIds.filter(id => !foundIds.includes(id));
      errors.push(`Some pickup stations are invalid, inactive, or not in the specified zone: ${missingIds.join(', ')}`);
    }

    // Check for duplicate stations
    const uniqueIds = [...new Set(pickupStationIds)];
    if (uniqueIds.length !== pickupStationIds.length) {
      errors.push('Duplicate pickup stations are not allowed');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Get pickup station utilization report for a zone
   */
  async getPickupStationUtilization(zoneId: string): Promise<{
    stationId: string;
    location: string;
    totalEvents: number;
    totalCapacity: number;
    totalCurrentCount: number;
    utilizationRate: number;
    averageCapacity: number;
  }[]> {
    if (!Types.ObjectId.isValid(zoneId)) {
      throw new BadRequestException('Invalid zone ID');
    }

    const stations = await this.pickupStationModel.find({ zoneId, isActive: true });
    const utilization = [];

    for (const station of stations) {
      const events = await this.eventModel.find({
        'pickupStations.pickupStationId': station._id,
        isActive: true
      });

      let totalCapacity = 0;
      let totalCurrentCount = 0;
      let eventCount = 0;

      events.forEach(event => {
        const stationAssignment = event.pickupStations.find(
          ps => ps.pickupStationId.toString() === station._id.toString()
        );
        if (stationAssignment) {
          totalCapacity += stationAssignment.maxCapacity || 0;
          totalCurrentCount += stationAssignment.currentCount || 0;
          eventCount++;
        }
      });

      const utilizationRate = totalCapacity > 0 ? (totalCurrentCount / totalCapacity) * 100 : 0;
      const averageCapacity = eventCount > 0 ? totalCapacity / eventCount : 0;

      utilization.push({
        stationId: station._id.toString(),
        location: station.location,
        totalEvents: eventCount,
        totalCapacity,
        totalCurrentCount,
        utilizationRate: Math.round(utilizationRate * 100) / 100,
        averageCapacity: Math.round(averageCapacity * 100) / 100
      });
    }

    return utilization.sort((a, b) => b.utilizationRate - a.utilizationRate);
  }
}
